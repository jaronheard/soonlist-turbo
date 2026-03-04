import { ConvexError, v } from "convex/values";

import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { generatePublicId } from "./utils";

// Helper function to get the current user ID from auth
async function getUserId(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  return identity.subject;
}

/**
 * Track (follow) an Instagram account's events.
 * Find-or-create the source and list, then add a listFollows entry.
 */
export const track = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, { username }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    // Normalize username (remove @ prefix if present)
    const normalizedUsername = username.replace(/^@/, "").toLowerCase().trim();
    if (!normalizedUsername) {
      throw new ConvexError("Invalid Instagram username");
    }

    // Check if source already exists
    const existingSource = await ctx.db
      .query("instagramSources")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    let listId: string;
    let sourceId: string;

    if (existingSource) {
      listId = existingSource.listId;
      sourceId = existingSource._id;

      // Reactivate if inactive
      if (existingSource.status === "inactive") {
        await ctx.db.patch(existingSource._id, {
          status: "active",
        });
      }
    } else {
      // Create a new system-managed list for this Instagram account
      const systemUserId = process.env.SYSTEM_USER_ID;
      if (!systemUserId) {
        throw new ConvexError("System user not configured");
      }

      listId = generatePublicId();
      await ctx.db.insert("lists", {
        id: listId,
        userId: systemUserId,
        name: `@${normalizedUsername} on Instagram`,
        description: `Events from @${normalizedUsername} on Instagram`,
        visibility: "public",
        contribution: "owner",
        created_at: new Date().toISOString(),
        updatedAt: null,
        sourceType: "instagram",
      });

      // Create the Instagram source
      const newSourceId = await ctx.db.insert("instagramSources", {
        username: normalizedUsername,
        listId,
        profileUrl: `https://instagram.com/${normalizedUsername}`,
        status: "active",
        followerCount: 0,
        checkIntervalHours: 4,
        postsChecked: 0,
        eventsFound: 0,
        createdAt: Date.now(),
      });

      sourceId = newSourceId;

      // Update the list with the source ID
      const list = await ctx.db
        .query("lists")
        .withIndex("by_custom_id", (q) => q.eq("id", listId))
        .first();
      if (list) {
        await ctx.db.patch(list._id, {
          sourceId: sourceId,
        });
      }
    }

    // Check if user already follows this list
    const existingFollow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", userId).eq("listId", listId),
      )
      .first();

    if (!existingFollow) {
      // Add list follow
      await ctx.db.insert("listFollows", {
        userId,
        listId,
      });

      // Add existing list events to user's feed
      await ctx.runMutation(internal.feedHelpers.addListEventsToUserFeed, {
        userId,
        listId,
      });

      // Increment follower count
      const source = existingSource
        ? existingSource
        : await ctx.db
            .query("instagramSources")
            .withIndex("by_username", (q) =>
              q.eq("username", normalizedUsername),
            )
            .first();

      if (source) {
        await ctx.db.patch(source._id, {
          followerCount: source.followerCount + 1,
        });
      }
    }

    return { listId, username: normalizedUsername };
  },
});

/**
 * Untrack (unfollow) an Instagram account's events.
 * Removes the listFollows entry and decrements follower count.
 */
export const untrack = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, { username }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    const normalizedUsername = username.replace(/^@/, "").toLowerCase().trim();

    const source = await ctx.db
      .query("instagramSources")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    if (!source) {
      throw new ConvexError("Instagram source not found");
    }

    // Remove list follow
    const existingFollow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", userId).eq("listId", source.listId),
      )
      .first();

    if (existingFollow) {
      await ctx.db.delete(existingFollow._id);

      // Remove list events from user feed
      await ctx.runMutation(internal.feedHelpers.removeListEventsFromUserFeed, {
        userId,
        listId: source.listId,
      });

      // Decrement follower count
      const newCount = Math.max(0, source.followerCount - 1);
      await ctx.db.patch(source._id, {
        followerCount: newCount,
        // Set to inactive if no followers
        ...(newCount === 0 ? { status: "inactive" as const } : {}),
      });
    }

    return { success: true };
  },
});

/**
 * Get Instagram sources that the current user follows.
 */
export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    // Get all list follows for user
    const follows = await ctx.db
      .query("listFollows")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // For each follow, check if the list is an Instagram source
    const sources = await Promise.all(
      follows.map(async (follow) => {
        const list = await ctx.db
          .query("lists")
          .withIndex("by_custom_id", (q) => q.eq("id", follow.listId))
          .first();

        if (list?.sourceType !== "instagram") {
          return null;
        }

        const source = await ctx.db
          .query("instagramSources")
          .withIndex("by_list", (q) => q.eq("listId", follow.listId))
          .first();

        if (!source) {
          return null;
        }

        return {
          ...source,
          listName: list.name,
        };
      }),
    );

    return sources.filter(
      (source): source is NonNullable<typeof source> => source !== null,
    );
  },
});

/**
 * Get an Instagram source by username.
 * Returns source info + whether the current user is tracking it.
 */
export const getByUsername = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, { username }) => {
    const userId = await getUserId(ctx);
    const normalizedUsername = username.replace(/^@/, "").toLowerCase().trim();

    const source = await ctx.db
      .query("instagramSources")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    if (!source) {
      return { exists: false as const, isTracked: false };
    }

    // Check if user follows the list
    let isTracked = false;
    if (userId) {
      const follow = await ctx.db
        .query("listFollows")
        .withIndex("by_user_and_list", (q) =>
          q.eq("userId", userId).eq("listId", source.listId),
        )
        .first();
      isTracked = !!follow;
    }

    return {
      exists: true as const,
      source,
      isTracked,
    };
  },
});

/**
 * Get events for a specific Instagram source.
 */
export const getEventsForSource = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, { username }) => {
    const normalizedUsername = username.replace(/^@/, "").toLowerCase().trim();

    const source = await ctx.db
      .query("instagramSources")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    if (!source) {
      return [];
    }

    // Get processed posts that resulted in events
    const processedPosts = await ctx.db
      .query("instagramProcessedPosts")
      .withIndex("by_source", (q) => q.eq("sourceId", source._id))
      .collect();

    const eventIds = processedPosts
      .filter((p) => p.isEvent && p.eventId)
      .map((p) => p.eventId!);

    // Fetch events
    const events = await Promise.all(
      eventIds.map(async (eventId) => {
        const event = await ctx.db
          .query("events")
          .withIndex("by_custom_id", (q) => q.eq("id", eventId))
          .first();
        return event;
      }),
    );

    // Filter nulls and sort by start date
    return events
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort(
        (a, b) =>
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime(),
      );
  },
});

/**
 * Get status info for an Instagram source (for UI display).
 */
export const getStatus = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, { username }) => {
    const normalizedUsername = username.replace(/^@/, "").toLowerCase().trim();

    const source = await ctx.db
      .query("instagramSources")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    if (!source) {
      return null;
    }

    return {
      username: source.username,
      status: source.status,
      lastCheckedAt: source.lastCheckedAt,
      followerCount: source.followerCount,
      postsChecked: source.postsChecked,
      eventsFound: source.eventsFound,
      errorMessage: source.errorMessage,
      listId: source.listId,
    };
  },
});

/**
 * Auto-track: Create a source on first visit (does not follow).
 * Called when a user visits /instagram/[username] and the source doesn't exist yet.
 */
export const ensureSource = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, { username }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    const normalizedUsername = username.replace(/^@/, "").toLowerCase().trim();
    if (!normalizedUsername) {
      throw new ConvexError("Invalid Instagram username");
    }

    // Check if source already exists
    const existingSource = await ctx.db
      .query("instagramSources")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    if (existingSource) {
      return { listId: existingSource.listId, username: normalizedUsername };
    }

    // Create a new system-managed list for this Instagram account
    const systemUserId = process.env.SYSTEM_USER_ID;
    if (!systemUserId) {
      throw new ConvexError("System user not configured");
    }

    const listId = generatePublicId();
    await ctx.db.insert("lists", {
      id: listId,
      userId: systemUserId,
      name: `@${normalizedUsername} on Instagram`,
      description: `Events from @${normalizedUsername} on Instagram`,
      visibility: "public",
      contribution: "owner",
      created_at: new Date().toISOString(),
      updatedAt: null,
      sourceType: "instagram",
    });

    const sourceId = await ctx.db.insert("instagramSources", {
      username: normalizedUsername,
      listId,
      profileUrl: `https://instagram.com/${normalizedUsername}`,
      status: "active",
      followerCount: 0,
      checkIntervalHours: 4,
      postsChecked: 0,
      eventsFound: 0,
      createdAt: Date.now(),
    });

    // Update the list with the source ID
    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", listId))
      .first();
    if (list) {
      await ctx.db.patch(list._id, {
        sourceId: sourceId,
      });
    }

    return { listId, username: normalizedUsername };
  },
});
