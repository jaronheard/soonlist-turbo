import { ConvexError, v } from "convex/values";

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

// Helper function to check if user can view a list
async function canUserViewList(
  ctx: QueryCtx,
  listId: string,
  userId: string | null,
): Promise<boolean> {
  const list = await ctx.db
    .query("lists")
    .withIndex("by_custom_id", (q) => q.eq("id", listId))
    .first();

  if (!list) {
    return false;
  }

  // Public and unlisted lists are viewable by anyone
  if (list.visibility === "public" || list.visibility === "unlisted") {
    return true;
  }

  // Private lists are only viewable by owner or members
  if (!userId) {
    return false;
  }
  // Owner can always view
  if (list.userId === userId) {
    return true;
  }
  // Check if user is a member
  const membership = await ctx.db
    .query("listMembers")
    .withIndex("by_list_and_user", (q) =>
      q.eq("listId", listId).eq("userId", userId),
    )
    .first();
  return !!membership;
}

async function _canUserContributeToList(
  ctx: QueryCtx,
  listId: string,
  userId: string | null,
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const list = await ctx.db
    .query("lists")
    .withIndex("by_custom_id", (q) => q.eq("id", listId))
    .first();

  if (!list) {
    return false;
  }

  // Owner can always contribute
  if (list.userId === userId) {
    return true;
  }

  const contribution = list.contribution ?? "open";

  // Open contribution mode: anyone who can view can contribute
  if (contribution === "open") {
    return canUserViewList(ctx, listId, userId);
  }

  // Restricted and owner modes: only members can contribute
  const membership = await ctx.db
    .query("listMembers")
    .withIndex("by_list_and_user", (q) =>
      q.eq("listId", listId).eq("userId", userId),
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

    const canView = await canUserViewList(ctx, listId, userId);
    if (!canView) {
      throw new ConvexError("Cannot follow this list: access denied");
    }

    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", listId))
      .first();

    if (!list) {
      throw new ConvexError("List not found");
    }

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

    const canView = await canUserViewList(ctx, listId, userId);
    if (!canView) {
      throw new ConvexError("Cannot view this list: access denied");
    }

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

    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", listId))
      .first();

    if (!list) {
      throw new ConvexError("List not found");
    }

    if (list.userId !== userId) {
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

    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", listId))
      .first();

    if (!list) {
      throw new ConvexError("List not found");
    }

    if (list.userId !== userId) {
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
 * TEMPORARY: Create test lists for testing
 * TODO: Remove after testing
 */
export const createTestLists = internalMutation({
  args: {
    creatorId: v.string(),
  },
  handler: async (ctx, { creatorId }) => {
    const now = new Date().toISOString();

    const list1 = await ctx.db.insert("lists", {
      id: "test_list_public_open",
      userId: creatorId,
      name: "Open Popups",
      description: "Public, anyone can add",
      visibility: "public",
      contribution: "open",
      created_at: now,
      updatedAt: null,
    });

    const list2 = await ctx.db.insert("lists", {
      id: "test_list_public_restricted",
      userId: creatorId,
      name: "Public curator picks",
      description: "Viewable by everyone, only collaborators add",
      visibility: "public",
      contribution: "restricted",
      created_at: now,
      updatedAt: null,
    });

    const list3 = await ctx.db.insert("lists", {
      id: "test_list_private_owner",
      userId: creatorId,
      name: "Private brainstorm",
      description: "Invite-only",
      visibility: "private",
      contribution: "owner",
      created_at: now,
      updatedAt: null,
    });

    return {
      list1: await ctx.db.get(list1),
      list2: await ctx.db.get(list2),
      list3: await ctx.db.get(list3),
    };
  },
});

/**
 * TEMPORARY: Add test list members for testing
 * TODO: Remove after testing
 */
export const addTestListMembers = internalMutation({
  args: {
    listId: v.string(),
    memberUserId: v.string(),
  },
  handler: async (ctx, { listId, memberUserId }) => {
    const existingMember = await ctx.db
      .query("listMembers")
      .withIndex("by_list_and_user", (q) =>
        q.eq("listId", listId).eq("userId", memberUserId),
      )
      .first();

    if (existingMember) {
      return { success: true, alreadyExists: true };
    }

    await ctx.db.insert("listMembers", {
      listId,
      userId: memberUserId,
    });

    return { success: true };
  },
});

/**
 * TEMPORARY: Link events to lists for testing
 * TODO: Remove after testing
 */
export const linkEventToList = internalMutation({
  args: {
    eventId: v.string(),
    listId: v.string(),
  },
  handler: async (ctx, { eventId, listId }) => {
    const existing = await ctx.db
      .query("eventToLists")
      .withIndex("by_event_and_list", (q) =>
        q.eq("eventId", eventId).eq("listId", listId),
      )
      .first();

    if (existing) {
      return { success: true, alreadyExists: true };
    }

    await ctx.db.insert("eventToLists", {
      eventId,
      listId,
    });

    return { success: true };
  },
});

/**
 * TEMPORARY: Test version of followList (no auth required)
 * TODO: Remove after testing
 */
export const testFollowList = internalMutation({
  args: {
    userId: v.string(),
    listId: v.string(),
  },
  handler: async (ctx, { userId, listId }) => {
    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", listId))
      .first();

    if (!list) {
      throw new ConvexError("List not found");
    }

    // Check visibility (same logic as canUserViewList but for MutationCtx)
    if (list.visibility === "public" || list.visibility === "unlisted") {
      // Public/unlisted lists are viewable by anyone
    } else {
      // Private lists: check if user is owner or member
      if (list.userId !== userId) {
        const membership = await ctx.db
          .query("listMembers")
          .withIndex("by_list_and_user", (q) =>
            q.eq("listId", listId).eq("userId", userId),
          )
          .first();
        if (!membership) {
          throw new ConvexError("Cannot follow this list: access denied");
        }
      }
    }

    const existingFollow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", userId).eq("listId", listId),
      )
      .first();

    if (existingFollow) {
      return { success: true, alreadyExists: true };
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
 * TEMPORARY: Test version of unfollowList (no auth required)
 * TODO: Remove after testing
 */
export const testUnfollowList = internalMutation({
  args: {
    userId: v.string(),
    listId: v.string(),
  },
  handler: async (ctx, { userId, listId }) => {
    const follow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", userId).eq("listId", listId),
      )
      .first();

    if (!follow) {
      return { success: true, notFound: true };
    }

    await ctx.db.delete(follow._id);

    await ctx.runMutation(internal.feedHelpers.removeListEventsFromUserFeed, {
      userId,
      listId,
    });

    return { success: true };
  },
});

/**
 * TEMPORARY: Test version of getFollowedLists (no auth required)
 * TODO: Remove after testing
 */
export const testGetFollowedLists = internalMutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
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

        // Check visibility (same logic as canUserViewList but for MutationCtx)
        if (list.visibility === "public" || list.visibility === "unlisted") {
          return list;
        }
        // Private lists: check if user is owner or member
        if (list.userId === userId) {
          return list;
        }
        const membership = await ctx.db
          .query("listMembers")
          .withIndex("by_list_and_user", (q) =>
            q.eq("listId", list.id).eq("userId", userId),
          )
          .first();
        if (membership) {
          return list;
        }
        return null;
      }),
    );

    return lists.filter(
      (list): list is NonNullable<typeof list> => list !== null,
    );
  },
});

/**
 * TEMPORARY: Test version of isFollowingList (no auth required)
 * TODO: Remove after testing
 */
export const testIsFollowingList = internalMutation({
  args: {
    userId: v.string(),
    listId: v.string(),
  },
  handler: async (ctx, { userId, listId }) => {
    const follow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", userId).eq("listId", listId),
      )
      .first();

    return !!follow;
  },
});
