import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";

// Helper function to get the current user ID from auth
async function getUserId(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  return identity.subject;
}

// Result type for list access check
type ListAccessResult =
  | { status: "notFound" }
  | { status: "forbidden" }
  | { status: "ok"; list: Doc<"lists"> };

// Helper function to check if user can view a list
// Returns a discriminated union to distinguish "not found" from "access denied"
async function checkListAccess(
  ctx: QueryCtx,
  listId: string,
  userId: string | null,
): Promise<ListAccessResult> {
  const list = await ctx.db
    .query("lists")
    .withIndex("by_custom_id", (q) => q.eq("id", listId))
    .first();

  if (!list) {
    return { status: "notFound" };
  }

  // Public and unlisted lists are viewable by anyone
  if (list.visibility === "public" || list.visibility === "unlisted") {
    return { status: "ok", list };
  }

  // Private lists are only viewable by owner or members
  if (!userId) {
    return { status: "forbidden" };
  }

  // At this point, userId is guaranteed to be a string
  const userIdString = userId;

  // Owner can always view
  if (list.userId === userIdString) {
    return { status: "ok", list };
  }
  // Check if user is a member
  const membership = await ctx.db
    .query("listMembers")
    .withIndex("by_list_and_user", (q) =>
      q.eq("listId", listId).eq("userId", userIdString),
    )
    .first();

  if (membership) {
    return { status: "ok", list };
  }

  return { status: "forbidden" };
}

// Helper function to check if user can view a list (backward compatibility)
// Returns boolean for cases where we don't need to distinguish error types
async function canUserViewList(
  ctx: QueryCtx,
  listId: string,
  userId: string | null,
): Promise<boolean> {
  const result = await checkListAccess(ctx, listId, userId);
  return result.status === "ok";
}

async function _canUserContributeToList(
  ctx: QueryCtx,
  listId: string,
  userId: string | null,
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  // At this point, userId is guaranteed to be a string
  const userIdString = userId;

  const list = await ctx.db
    .query("lists")
    .withIndex("by_custom_id", (q) => q.eq("id", listId))
    .first();

  if (!list) {
    return false;
  }

  // Owner can always contribute
  if (list.userId === userIdString) {
    return true;
  }

  const contribution = list.contribution ?? "open";

  // Open contribution mode: anyone who can view can contribute
  if (contribution === "open") {
    return canUserViewList(ctx, listId, userIdString);
  }

  // Restricted and owner modes: only members can contribute
  const membership = await ctx.db
    .query("listMembers")
    .withIndex("by_list_and_user", (q) =>
      q.eq("listId", listId).eq("userId", userIdString),
    )
    .first();
  return !!membership;
}

/**
 * Follow a list
 */
export const followList = mutation({
  args: {
    listId: v.string(),
  },
  handler: async (ctx, { listId }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    const accessResult = await checkListAccess(ctx, listId, userId);
    if (accessResult.status === "notFound") {
      throw new ConvexError("List not found");
    }
    if (accessResult.status === "forbidden") {
      throw new ConvexError("Cannot follow this list: access denied");
    }

    // accessResult.status === "ok", and we have the list
    const existingFollow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", userId).eq("listId", listId),
      )
      .first();

    if (existingFollow) {
      return { success: true };
    }

    await ctx.db.insert("listFollows", {
      userId,
      listId,
    });

    await ctx.runMutation(internal.feedHelpers.addListEventsToUserFeed, {
      userId,
      listId,
    });

    return { success: true };
  },
});

/**
 * Unfollow a list
 */
export const unfollowList = mutation({
  args: {
    listId: v.string(),
  },
  handler: async (ctx, { listId }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    const existingFollow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", userId).eq("listId", listId),
      )
      .first();

    if (existingFollow) {
      await ctx.db.delete(existingFollow._id);
      await ctx.runMutation(internal.feedHelpers.removeListEventsFromUserFeed, {
        userId,
        listId,
      });
    }

    return { success: true };
  },
});

/**
 * Get all lists a user follows
 */
export const getFollowedLists = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    const follows = await ctx.db
      .query("listFollows")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const lists = await Promise.all(
      follows.map(async (follow) => {
        const list = await ctx.db
          .query("lists")
          .withIndex("by_custom_id", (q) => q.eq("id", follow.listId))
          .first();

        if (!list) {
          return null;
        }

        const canView = await canUserViewList(ctx, follow.listId, userId);
        if (!canView) {
          return null;
        }

        return list;
      }),
    );

    return lists.filter(
      (list): list is NonNullable<typeof list> => list !== null,
    );
  },
});

/**
 * Get all users following a list
 */
export const getListFollowers = query({
  args: {
    listId: v.string(),
  },
  handler: async (ctx, { listId }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    const accessResult = await checkListAccess(ctx, listId, userId);
    if (accessResult.status === "notFound") {
      throw new ConvexError("List not found");
    }
    if (accessResult.status === "forbidden") {
      throw new ConvexError("Cannot view this list: access denied");
    }

    // accessResult.status === "ok"
    const follows = await ctx.db
      .query("listFollows")
      .withIndex("by_list", (q) => q.eq("listId", listId))
      .collect();

    return follows.map((follow) => follow.userId);
  },
});

/**
 * Check if user follows a specific list
 */
export const isFollowingList = query({
  args: {
    listId: v.string(),
  },
  handler: async (ctx, { listId }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      return false;
    }

    const follow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", userId).eq("listId", listId),
      )
      .first();

    return !!follow;
  },
});

/**
 * Add a member to a list (for restricted/owner contribution modes)
 */
export const addListMember = mutation({
  args: {
    listId: v.string(),
    memberUserId: v.string(),
  },
  handler: async (ctx, { listId, memberUserId }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    // At this point, userId is guaranteed to be a string
    const userIdString = userId;

    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", listId))
      .first();

    if (!list) {
      throw new ConvexError("List not found");
    }

    if (list.userId !== userIdString) {
      throw new ConvexError("Only the list owner can add members");
    }

    const existingMember = await ctx.db
      .query("listMembers")
      .withIndex("by_list_and_user", (q) =>
        q.eq("listId", listId).eq("userId", memberUserId),
      )
      .first();

    if (existingMember) {
      return { success: true };
    }

    await ctx.db.insert("listMembers", {
      listId,
      userId: memberUserId,
    });

    return { success: true };
  },
});

/**
 * Remove a member from a list
 */
export const removeListMember = mutation({
  args: {
    listId: v.string(),
    memberUserId: v.string(),
  },
  handler: async (ctx, { listId, memberUserId }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    // At this point, userId is guaranteed to be a string
    const userIdString = userId;

    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", listId))
      .first();

    if (!list) {
      throw new ConvexError("List not found");
    }

    if (list.userId !== userIdString) {
      throw new ConvexError("Only the list owner can remove members");
    }

    const existingMember = await ctx.db
      .query("listMembers")
      .withIndex("by_list_and_user", (q) =>
        q.eq("listId", listId).eq("userId", memberUserId),
      )
      .first();

    if (existingMember) {
      await ctx.db.delete(existingMember._id);
    }

    return { success: true };
  },
});

/**
 * Add a contributor to a list (for contributor-type lists)
 */
export const addContributor = mutation({
  args: {
    listId: v.string(),
    contributorUserId: v.string(),
  },
  handler: async (ctx, { listId, contributorUserId }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", listId))
      .first();

    if (!list) {
      throw new ConvexError("List not found");
    }

    if (list.userId !== userId) {
      throw new ConvexError("Only the list owner can add contributors");
    }

    const existing = await ctx.db
      .query("listContributors")
      .withIndex("by_list_and_user", (q) =>
        q.eq("listId", listId).eq("userId", contributorUserId),
      )
      .first();

    if (existing) {
      return { success: true };
    }

    await ctx.db.insert("listContributors", {
      listId,
      userId: contributorUserId,
      addedAt: new Date().toISOString(),
      addedBy: userId,
    });

    // Backfill: add the contributor's existing public events to this list
    await ctx.runMutation(internal.lists.backfillContributorEvents, {
      listId,
      contributorUserId,
    });

    return { success: true };
  },
});

/**
 * Remove a contributor from a list
 */
export const removeContributor = mutation({
  args: {
    listId: v.string(),
    contributorUserId: v.string(),
  },
  handler: async (ctx, { listId, contributorUserId }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", listId))
      .first();

    if (!list) {
      throw new ConvexError("List not found");
    }

    if (list.userId !== userId) {
      throw new ConvexError("Only the list owner can remove contributors");
    }

    const existing = await ctx.db
      .query("listContributors")
      .withIndex("by_list_and_user", (q) =>
        q.eq("listId", listId).eq("userId", contributorUserId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});

/**
 * Internal mutation to backfill a contributor's public events into a list
 */
export const backfillContributorEvents = internalMutation({
  args: {
    listId: v.string(),
    contributorUserId: v.string(),
  },
  handler: async (ctx, { listId, contributorUserId }) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", contributorUserId))
      .collect();

    for (const event of events) {
      if (event.visibility !== "public") continue;

      const existing = await ctx.db
        .query("eventToLists")
        .withIndex("by_event_and_list", (q) =>
          q.eq("eventId", event.id).eq("listId", listId),
        )
        .first();

      if (!existing) {
        await ctx.db.insert("eventToLists", {
          eventId: event.id,
          listId,
        });

        await ctx.runMutation(
          internal.feedHelpers.addEventToListFollowersFeeds,
          { eventId: event.id, listId },
        );
      }
    }
  },
});

/**
 * Get all system lists
 */
export const getSystemLists = query({
  args: {},
  handler: async (ctx) => {
    const systemLists = await ctx.db
      .query("lists")
      .withIndex("by_system_type", (q) => q.eq("isSystemList", true))
      .collect();

    return systemLists;
  },
});

/**
 * Get a list by its custom ID (public query)
 */
export const getList = query({
  args: {
    listId: v.string(),
  },
  handler: async (ctx, { listId }) => {
    const userId = await getUserId(ctx);
    const accessResult = await checkListAccess(ctx, listId, userId);

    if (accessResult.status !== "ok") {
      return null;
    }

    return accessResult.list;
  },
});

/**
 * Internal mutation to follow a system list (used by migrations and internal flows)
 */
export const followSystemList = internalMutation({
  args: {
    userId: v.string(),
    listId: v.string(),
  },
  handler: async (ctx, { userId, listId }) => {
    const existingFollow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", userId).eq("listId", listId),
      )
      .first();

    if (existingFollow) {
      return;
    }

    await ctx.db.insert("listFollows", {
      userId,
      listId,
    });

    await ctx.runMutation(internal.feedHelpers.addListEventsToUserFeed, {
      userId,
      listId,
    });
  },
});
