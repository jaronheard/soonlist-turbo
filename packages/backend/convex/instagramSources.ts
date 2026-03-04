import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { generatePublicId } from "./utils";

const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || "";
const DEFAULT_CHECK_INTERVAL_HOURS = 4;

// Helper to get current user ID from auth
async function getUserId(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  return identity.subject;
}

/**
 * Track (follow) an Instagram account's events.
 * Find-or-create the source and list, then follow the list.
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

    // Normalize username (strip @ prefix, lowercase)
    const normalizedUsername = username.replace(/^@/, "").toLowerCase().trim();
    if (!normalizedUsername || normalizedUsername.length === 0) {
      throw new ConvexError("Invalid Instagram username");
    }

    // Find existing source
    let source = await ctx.db
      .query("instagramSources")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    let listId: string;

    if (source) {
      listId = source.listId;

      // Reactivate if inactive
      if (source.status === "inactive") {
        await ctx.db.patch(source._id, {
          status: "active",
          errorMessage: undefined,
        });
      }
    } else {
      // Create a new list for this source
      listId = generatePublicId();
      await ctx.db.insert("lists", {
        id: listId,
        userId: SYSTEM_USER_ID,
        name: `@${normalizedUsername} on Instagram`,
        description: `Events from @${normalizedUsername} on Instagram`,
        visibility: "public",
        contribution: "owner",
        created_at: new Date().toISOString(),
        updatedAt: null,
        sourceType: "instagram",
      });

      // Create the source
      const sourceDoc = await ctx.db.insert("instagramSources", {
        username: normalizedUsername,
        listId,
        profileUrl: `https://instagram.com/${normalizedUsername}`,
        status: "active",
        followerCount: 0,
        checkIntervalHours: DEFAULT_CHECK_INTERVAL_HOURS,
        postsChecked: 0,
        eventsFound: 0,
        createdAt: Date.now(),
      });

      source = await ctx.db.get(sourceDoc);

      // Update list with sourceId reference
      const list = await ctx.db
        .query("lists")
        .withIndex("by_custom_id", (q) => q.eq("id", listId))
        .first();
      if (list && source) {
        await ctx.db.patch(list._id, {
          sourceId: source._id,
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
      // Follow the list
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
      if (source) {
        await ctx.db.patch(source._id, {
          followerCount: (source.followerCount || 0) + 1,
        });
      }
    }

    return { success: true, listId };
  },
});

/**
 * Untrack (unfollow) an Instagram account's events.
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
      return { success: true };
    }

    const existingFollow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", userId).eq("listId", source.listId),
      )
      .first();

    if (existingFollow) {
      await ctx.db.delete(existingFollow._id);

      // Remove list events from user's feed
      await ctx.runMutation(internal.feedHelpers.removeListEventsFromUserFeed, {
        userId,
        listId: source.listId,
      });

      // Decrement follower count
      const newCount = Math.max(0, (source.followerCount || 0) - 1);
      await ctx.db.patch(source._id, {
        followerCount: newCount,
        // Deactivate if no followers
        ...(newCount === 0 ? { status: "inactive" as const } : {}),
      });
    }

    return { success: true };
  },
});

/**
 * Ensure a source exists for a username (auto-track on page visit).
 * Does NOT follow the list — just creates the source if it doesn't exist.
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
    if (!normalizedUsername || normalizedUsername.length === 0) {
      throw new ConvexError("Invalid Instagram username");
    }

    // Check if source already exists
    const existingSource = await ctx.db
      .query("instagramSources")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    if (existingSource) {
      return { listId: existingSource.listId, isNew: false };
    }

    // Create a new list for this source
    const listId = generatePublicId();
    await ctx.db.insert("lists", {
      id: listId,
      userId: SYSTEM_USER_ID,
      name: `@${normalizedUsername} on Instagram`,
      description: `Events from @${normalizedUsername} on Instagram`,
      visibility: "public",
      contribution: "owner",
      created_at: new Date().toISOString(),
      updatedAt: null,
      sourceType: "instagram",
    });

    // Create the source
    const sourceDoc = await ctx.db.insert("instagramSources", {
      username: normalizedUsername,
      listId,
      profileUrl: `https://instagram.com/${normalizedUsername}`,
      status: "active",
      followerCount: 0,
      checkIntervalHours: DEFAULT_CHECK_INTERVAL_HOURS,
      postsChecked: 0,
      eventsFound: 0,
      createdAt: Date.now(),
    });

    // Update list with sourceId reference
    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", listId))
      .first();
    if (list) {
      await ctx.db.patch(list._id, {
        sourceId: sourceDoc,
      });
    }

    // Schedule initial scrape
    await ctx.scheduler.runAfter(
      0,
      internal.instagramScraper.processSource,
      { username: normalizedUsername },
    );

    return { listId, isNew: true };
  },
});

/**
 * Get Instagram sources the current user follows.
 */
export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    // Get all list follows for the user
    const follows = await ctx.db
      .query("listFollows")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Find which followed lists are Instagram sources
    const results: {
      source: Doc<"instagramSources">;
      list: Doc<"lists">;
      isFollowing: boolean;
    }[] = [];

    for (const follow of follows) {
      const list = await ctx.db
        .query("lists")
        .withIndex("by_custom_id", (q) => q.eq("id", follow.listId))
        .first();

      if (list?.sourceType === "instagram") {
        const source = await ctx.db
          .query("instagramSources")
          .withIndex("by_list", (q) => q.eq("listId", list.id))
          .first();

        if (source) {
          results.push({ source, list, isFollowing: true });
        }
      }
    }

    return results;
  },
});

/**
 * Get a source by Instagram username.
 */
export const getByUsername = query({
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
      return { found: false as const };
    }

    // Check if current user is following this source's list
    const follow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", userId).eq("listId", source.listId),
      )
      .first();

    return {
      found: true as const,
      source,
      isFollowing: !!follow,
    };
  },
});

/**
 * Get detailed status of a source.
 */
export const getStatus = query({
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
      return null;
    }

    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", source.listId))
      .first();

    const follow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", userId).eq("listId", source.listId),
      )
      .first();

    // Get processed posts count
    const processedPosts = await ctx.db
      .query("instagramProcessedPosts")
      .withIndex("by_source", (q) => q.eq("sourceId", source._id))
      .collect();

    return {
      source,
      list,
      isFollowing: !!follow,
      processedPostsCount: processedPosts.length,
      eventPostsCount: processedPosts.filter((p) => p.isEvent).length,
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
      return [];
    }

    // Get processed posts that have events
    const processedPosts = await ctx.db
      .query("instagramProcessedPosts")
      .withIndex("by_source", (q) => q.eq("sourceId", source._id))
      .collect();

    const eventPosts = processedPosts.filter((p) => p.isEvent && p.eventId);

    // Fetch the actual events
    const events = await Promise.all(
      eventPosts.map(async (post) => {
        if (!post.eventId) return null;
        const event = await ctx.db
          .query("events")
          .withIndex("by_custom_id", (q) => q.eq("id", post.eventId!))
          .first();
        return event;
      }),
    );

    // Filter nulls and sort by startDateTime
    return events
      .filter((e): e is Doc<"events"> => e !== null)
      .sort(
        (a, b) =>
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime(),
      );
  },
});
