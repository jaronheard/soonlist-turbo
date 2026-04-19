import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { listFollowsAggregate } from "./aggregates";
import { enrichEventsAndFilterNulls } from "./model/events";
import { getViewableListIds } from "./model/lists";
import { generatePublicId } from "./utils";

type EnrichedEvent = Awaited<
  ReturnType<typeof enrichEventsAndFilterNulls>
>[number];

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
 * Internal helper: get or create a user's personal Soonlist.
 * Used during event creation and user signup.
 */
export async function getOrCreatePersonalList(
  ctx: MutationCtx,
  userId: string,
): Promise<Doc<"lists">> {
  // Look up existing personal list
  const existing = await ctx.db
    .query("lists")
    .withIndex("by_user_and_isSystemList_and_systemListType", (q) =>
      q
        .eq("userId", userId)
        .eq("isSystemList", true)
        .eq("systemListType", "personal"),
    )
    .first();

  if (existing) {
    return existing;
  }

  // Look up user for display name
  const user = await ctx.db
    .query("users")
    .withIndex("by_custom_id", (q) => q.eq("id", userId))
    .first();

  const displayName = user?.displayName || user?.username || "User";
  const username = user?.username || "user";
  const listId = generatePublicId();

  const docId = await ctx.db.insert("lists", {
    id: listId,
    userId,
    name: `${displayName}'s Soonlist`,
    description: `${displayName}'s Soonlist`,
    visibility: "public",
    isSystemList: true,
    systemListType: "personal",
    slug: `user-${username}`,
    created_at: new Date().toISOString(),
    updatedAt: null,
  });

  return (await ctx.db.get(docId))!;
}

/**
 * Get the personal list for a user (public query)
 */
export const getPersonalListForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const personalList = await ctx.db
      .query("lists")
      .withIndex("by_user_and_isSystemList_and_systemListType", (q) =>
        q
          .eq("userId", userId)
          .eq("isSystemList", true)
          .eq("systemListType", "personal"),
      )
      .first();

    if (!personalList) {
      return null;
    }

    const viewerUserId = await getUserId(ctx);
    const accessResult = await checkListAccess(
      ctx,
      personalList.id,
      viewerUserId,
    );
    if (accessResult.status !== "ok") {
      return null;
    }

    return personalList;
  },
});

/**
 * Get all public/unlisted lists for a user (personal list first), plus contributed lists.
 * Includes follower count per list.
 */
export const getListsForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Get user's own lists
    const ownedLists = await ctx.db
      .query("lists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter to public/unlisted only
    const visibleOwned = ownedLists.filter(
      (l) => l.visibility === "public" || l.visibility === "unlisted",
    );

    // Get lists where user is a member (contributor)
    const memberships = await ctx.db
      .query("listMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const contributedLists = await Promise.all(
      memberships.map(async (m) => {
        const list = await ctx.db
          .query("lists")
          .withIndex("by_custom_id", (q) => q.eq("id", m.listId))
          .first();
        return list;
      }),
    );

    const visibleContributed = contributedLists.filter(
      (l): l is Doc<"lists"> =>
        l !== null &&
        (l.visibility === "public" || l.visibility === "unlisted") &&
        l.userId !== userId, // Exclude owned lists (already in visibleOwned)
    );

    // Combine and deduplicate
    const allLists = [...visibleOwned, ...visibleContributed];

    // Sort: personal list first, then by name
    allLists.sort((a, b) => {
      if (a.isSystemList && a.systemListType === "personal") return -1;
      if (b.isSystemList && b.systemListType === "personal") return 1;
      return a.name.localeCompare(b.name);
    });

    // Add follower count per list (O(log n) via aggregate)
    const listsWithCounts = await Promise.all(
      allLists.map(async (list) => {
        const followerCount = await listFollowsAggregate.count(ctx, {
          namespace: list.id,
          bounds: {},
        });
        return { ...list, followerCount };
      }),
    );

    return listsWithCounts;
  },
});

/**
 * Get lists where the current user is a listMember (contributing to)
 */
export const getContributingLists = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      return [];
    }

    const memberships = await ctx.db
      .query("listMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const lists = await Promise.all(
      memberships.map(async (m) => {
        const list = await ctx.db
          .query("lists")
          .withIndex("by_custom_id", (q) => q.eq("id", m.listId))
          .first();
        return list;
      }),
    );

    return lists.filter((l): l is Doc<"lists"> => l !== null);
  },
});

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

    const followId = await ctx.db.insert("listFollows", {
      userId,
      listId,
    });
    const followDoc = (await ctx.db.get(followId))!;
    await listFollowsAggregate.insert(ctx, followDoc);

    await ctx.runMutation(internal.feedHelpers.addListEventsToUserFeed, {
      userId,
      listId,
    });

    return { success: true };
  },
});

/**
 * Follow a user's personal list by username.
 * Encapsulates user lookup, personal list lookup, and follow in one server-side call.
 */
export const followUserByUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    // Look up target user by username
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (!targetUser) {
      return { success: false as const, reason: "User not found" };
    }

    // Get their personal list
    const personalList = await ctx.db
      .query("lists")
      .withIndex("by_user_and_isSystemList_and_systemListType", (q) =>
        q
          .eq("userId", targetUser.id)
          .eq("isSystemList", true)
          .eq("systemListType", "personal"),
      )
      .first();

    if (!personalList) {
      return { success: false as const, reason: "User has no personal list" };
    }

    const listId = personalList.id;

    const accessResult = await checkListAccess(ctx, listId, userId);
    if (accessResult.status !== "ok") {
      return {
        success: false as const,
        reason: "Cannot follow this list: access denied",
      };
    }

    // Check if already following
    const existingFollow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", userId).eq("listId", listId),
      )
      .first();

    if (existingFollow) {
      return { success: true as const };
    }

    const followId = await ctx.db.insert("listFollows", {
      userId,
      listId,
    });
    const followDoc = (await ctx.db.get(followId))!;
    await listFollowsAggregate.insert(ctx, followDoc);

    await ctx.runMutation(internal.feedHelpers.addListEventsToUserFeed, {
      userId,
      listId,
    });

    return { success: true as const };
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
      await listFollowsAggregate.deleteIfExists(ctx, existingFollow);
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
      return [];
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
 * Get a list by its slug.
 *
 * Returns a discriminated union so callers can distinguish
 * "not found" from "exists but private":
 *   { status: "ok", list }       — public/unlisted or viewer has access
 *   { status: "private", owner } — list exists but viewer cannot see contents
 *   { status: "notFound" }       — no list with this slug
 */
const listOwnerValidator = v.union(
  v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    id: v.string(),
    username: v.string(),
    displayName: v.string(),
    userImage: v.string(),
    bio: v.union(v.string(), v.null()),
    publicEmail: v.union(v.string(), v.null()),
    publicPhone: v.union(v.string(), v.null()),
    publicInsta: v.union(v.string(), v.null()),
    publicWebsite: v.union(v.string(), v.null()),
    emoji: v.union(v.string(), v.null()),
    publicListEnabled: v.optional(v.boolean()),
    publicListName: v.optional(v.string()),
  }),
  v.null(),
);

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      status: v.literal("ok"),
      list: v.object({
        _id: v.id("lists"),
        _creationTime: v.number(),
        id: v.string(),
        userId: v.string(),
        name: v.string(),
        description: v.string(),
        visibility: v.union(
          v.literal("public"),
          v.literal("unlisted"),
          v.literal("private"),
        ),
        contribution: v.optional(
          v.union(
            v.literal("open"),
            v.literal("restricted"),
            v.literal("owner"),
          ),
        ),
        listType: v.optional(
          v.union(v.literal("standard"), v.literal("contributor")),
        ),
        isSystemList: v.optional(v.boolean()),
        systemListType: v.optional(v.string()),
        slug: v.optional(v.string()),
        created_at: v.string(),
        updatedAt: v.union(v.string(), v.null()),
        owner: listOwnerValidator,
        contributorCount: v.number(),
        followerCount: v.number(),
      }),
    }),
    v.object({
      status: v.literal("private"),
      owner: listOwnerValidator,
    }),
    v.object({
      status: v.literal("notFound"),
    }),
  ),
  handler: async (ctx, { slug }) => {
    const list = await ctx.db
      .query("lists")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!list) {
      return { status: "notFound" as const };
    }

    const owner = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", list.userId))
      .first();

    const sanitizedOwner = owner
      ? {
          _id: owner._id,
          _creationTime: owner._creationTime,
          id: owner.id,
          username: owner.username,
          displayName: owner.displayName,
          userImage: owner.userImage,
          bio: owner.bio,
          publicEmail: owner.publicEmail,
          publicPhone: owner.publicPhone,
          publicInsta: owner.publicInsta,
          publicWebsite: owner.publicWebsite,
          emoji: owner.emoji,
          publicListEnabled: owner.publicListEnabled,
          publicListName: owner.publicListName,
        }
      : null;

    // Use the same access rules as the rest of the backend so owners and
    // members of a private list can still resolve its detail page (used by
    // the saver-attribution flow which deep-links to `/list/[slug]`).
    const viewerId = await getUserId(ctx);
    const accessResult = await checkListAccess(ctx, list.id, viewerId);

    if (accessResult.status === "ok") {
      const contributors = await ctx.db
        .query("listMembers")
        .withIndex("by_list_and_role", (q) =>
          q.eq("listId", list.id).eq("role", "contributor"),
        )
        .collect();

      const followerCount = await listFollowsAggregate.count(ctx, {
        namespace: list.id,
        bounds: {},
      });

      return {
        status: "ok" as const,
        list: {
          ...list,
          owner: sanitizedOwner,
          contributorCount: contributors.length,
          followerCount,
        },
      };
    }

    return {
      status: "private" as const,
      owner: sanitizedOwner,
    };
  },
});

/**
 * Get all system lists
 */
export const getSystemLists = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("lists"),
      _creationTime: v.number(),
      id: v.string(),
      userId: v.string(),
      name: v.string(),
      description: v.string(),
      visibility: v.union(
        v.literal("public"),
        v.literal("unlisted"),
        v.literal("private"),
      ),
      contribution: v.optional(
        v.union(v.literal("open"), v.literal("restricted"), v.literal("owner")),
      ),
      listType: v.optional(
        v.union(v.literal("standard"), v.literal("contributor")),
      ),
      isSystemList: v.optional(v.boolean()),
      systemListType: v.optional(v.string()),
      slug: v.optional(v.string()),
      created_at: v.string(),
      updatedAt: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const lists = await ctx.db
      .query("lists")
      .withIndex("by_isSystemList_and_systemListType", (q) =>
        q.eq("isSystemList", true),
      )
      .collect();

    return lists;
  },
});

/**
 * Add a contributor to a contributor list
 */
export const addContributor = mutation({
  args: {
    listId: v.string(),
    contributorUserId: v.string(),
  },
  returns: v.object({ success: v.literal(true) }),
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

    if (list.listType !== "contributor") {
      throw new ConvexError("This list does not support contributors");
    }

    const contributorUser = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", contributorUserId))
      .first();

    if (!contributorUser) {
      throw new ConvexError("Contributor user not found");
    }

    const existingMember = await ctx.db
      .query("listMembers")
      .withIndex("by_list_and_user", (q) =>
        q.eq("listId", listId).eq("userId", contributorUserId),
      )
      .first();

    if (existingMember) {
      if (existingMember.role !== "contributor") {
        await ctx.db.patch(existingMember._id, { role: "contributor" });
        await ctx.scheduler.runAfter(
          0,
          internal.lists.backfillContributorEvents,
          {
            listId,
            contributorUserId,
          },
        );
      }
      return { success: true as const };
    }

    await ctx.db.insert("listMembers", {
      listId,
      userId: contributorUserId,
      role: "contributor",
    });

    await ctx.scheduler.runAfter(0, internal.lists.backfillContributorEvents, {
      listId,
      contributorUserId,
    });

    return { success: true as const };
  },
});

/**
 * Remove a contributor from a contributor list
 */
export const removeContributor = mutation({
  args: {
    listId: v.string(),
    contributorUserId: v.string(),
  },
  returns: v.object({ success: v.literal(true) }),
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

    if (list.listType !== "contributor") {
      throw new ConvexError(
        "removeContributor can only be used with contributor-type lists",
      );
    }

    const existingMember = await ctx.db
      .query("listMembers")
      .withIndex("by_list_and_user", (q) =>
        q.eq("listId", listId).eq("userId", contributorUserId),
      )
      .first();

    if (existingMember) {
      await ctx.db.patch(existingMember._id, { role: "member" });

      await ctx.scheduler.runAfter(
        0,
        internal.lists.removeContributorEventsAction,
        {
          listId,
          contributorUserId,
        },
      );
    }

    return { success: true as const };
  },
});

/**
 * Internal: Remove a contributor's events from a list (one batch/page)
 */
export const removeContributorEventsBatch = internalMutation({
  args: {
    listId: v.string(),
    contributorUserId: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({
    processed: v.number(),
    removed: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { listId, contributorUserId, cursor }) => {
    const result = await ctx.db
      .query("eventToLists")
      .withIndex("by_list", (q) => q.eq("listId", listId))
      .paginate({ numItems: 100, cursor });

    let removed = 0;

    for (const entry of result.page) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", entry.eventId))
        .first();

      if (event?.userId === contributorUserId) {
        await ctx.db.delete(entry._id);

        // Schedule feed cleanup in a separate transaction to reduce bandwidth
        // of this batch mutation — removeEventFromListFollowersFeeds does
        // multiple queries per follower
        await ctx.scheduler.runAfter(
          0,
          internal.feedHelpers.removeEventFromListFollowersFeeds,
          {
            eventId: entry.eventId,
            listId,
          },
        );
        removed++;
      }
    }

    return {
      processed: result.page.length,
      removed,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * Internal: Remove a contributor's events from a list.
 * Orchestrates batch processing to avoid transaction limits.
 */
export const removeContributorEventsAction = internalAction({
  args: {
    listId: v.string(),
    contributorUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { listId, contributorUserId }) => {
    let totalProcessed = 0;
    let totalRemoved = 0;
    let cursor: string | null = null;

    while (true) {
      const result: {
        processed: number;
        removed: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(internal.lists.removeContributorEventsBatch, {
        listId,
        contributorUserId,
        cursor,
      });

      totalProcessed += result.processed;
      totalRemoved += result.removed;

      if (result.isDone) {
        break;
      }

      if (result.nextCursor === cursor) {
        console.error(
          `removeContributorEventsAction: cursor stalled at ${cursor} for list ${listId}`,
        );
        break;
      }

      cursor = result.nextCursor;
    }

    console.log(
      `Removed ${totalRemoved} events from list ${listId} for contributor ${contributorUserId} (processed ${totalProcessed})`,
    );

    return null;
  },
});

/**
 * Internal: Backfill a contributor's existing public events into a list (one batch/page)
 */
export const backfillContributorEventsBatch = internalMutation({
  args: {
    listId: v.string(),
    contributorUserId: v.string(),
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    added: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { listId, contributorUserId, cursor, batchSize }) => {
    const result = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", contributorUserId))
      .paginate({ numItems: batchSize, cursor });

    let added = 0;

    for (const event of result.page) {
      if (event.visibility !== "public") {
        continue;
      }

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

        // Schedule feed population in a separate transaction to avoid
        // hitting transaction limits when there are many followers
        await ctx.scheduler.runAfter(
          0,
          internal.feedHelpers.addEventToListFollowersFeeds,
          {
            eventId: event.id,
            listId,
          },
        );
        added++;
      }
    }

    return {
      processed: result.page.length,
      added,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * Get events for a list by slug, paginated to stay within Convex limits.
 */
export const getEventsForList = query({
  args: {
    slug: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { slug, paginationOpts }) => {
    const emptyResults = async () => {
      const emptyPage = await ctx.db
        .query("eventToLists")
        .withIndex("by_list", (q) => q.eq("listId", "__missing_list__"))
        .paginate(paginationOpts);
      return {
        ...emptyPage,
        page: [] as EnrichedEvent[],
      };
    };

    // Find the list by slug
    const list = await ctx.db
      .query("lists")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!list) {
      return emptyResults();
    }

    // Private lists are still viewable by their owner or members — mirror
    // getBySlug / checkListAccess so authorized viewers see the events.
    const viewerId = await getUserId(ctx);
    const accessResult = await checkListAccess(ctx, list.id, viewerId);
    if (accessResult.status !== "ok") {
      return emptyResults();
    }

    // Paginate list memberships so large lists don't hydrate every event at once.
    const eventToLists = await ctx.db
      .query("eventToLists")
      .withIndex("by_list", (q) => q.eq("listId", list.id))
      .paginate(paginationOpts);

    const events = await Promise.all(
      eventToLists.page.map((etl) =>
        ctx.db
          .query("events")
          .withIndex("by_custom_id", (q) => q.eq("id", etl.eventId))
          .unique(),
      ),
    );

    const visibleEvents = events
      .filter((event): event is NonNullable<typeof event> => event !== null)
      .filter((event) => event.visibility !== "private");

    const enrichedEvents = await enrichEventsAndFilterNulls(ctx, visibleEvents);

    // Strip private-unviewable lists from each event.lists before returning.
    // enrichEventsAndFilterNulls hydrates event.lists with ALL lists the
    // event belongs to, including ones this viewer can't see. The client
    // (SavedByModal) trusts the server's filtering, so we must enforce
    // visibility here — same contract as queryFeed/queryGroupedFeed in
    // feeds.ts.
    const allListsAcrossEvents = enrichedEvents.flatMap((e) => e.lists ?? []);
    const viewableListIds = await getViewableListIds(
      ctx,
      allListsAcrossEvents,
      viewerId,
    );
    const filteredEvents = enrichedEvents.map((event) => ({
      ...event,
      lists: (event.lists ?? []).filter((l) => viewableListIds.has(l.id)),
    }));

    return {
      ...eventToLists,
      page: filteredEvents,
    };
  },
});

/**
 * Internal: Backfill a contributor's existing public events into a list.
 * Orchestrates batch processing to avoid transaction limits.
 */
export const backfillContributorEvents = internalAction({
  args: {
    listId: v.string(),
    contributorUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { listId, contributorUserId }) => {
    let totalProcessed = 0;
    let totalAdded = 0;
    let cursor: string | null = null;
    const batchSize = 100;

    while (true) {
      const result: {
        processed: number;
        added: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(internal.lists.backfillContributorEventsBatch, {
        listId,
        contributorUserId,
        cursor,
        batchSize,
      });

      totalProcessed += result.processed;
      totalAdded += result.added;

      if (result.isDone) {
        break;
      }
      if (result.nextCursor === cursor) {
        console.error(
          `Cursor did not advance for list ${listId} contributor ${contributorUserId} — aborting to prevent infinite loop`,
        );
        break;
      }
      cursor = result.nextCursor;
    }

    console.log(
      `Backfilled ${totalAdded} events to list ${listId} for contributor ${contributorUserId} (processed ${totalProcessed})`,
    );

    return null;
  },
});

// Filters out relative paths, bad protocols, and unparseable garbage before
// URLs reach @vercel/og. satori fails the whole render on a bad image fetch,
// so we'd rather skip the screenshot than crash the OG route.
function isLikelyHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Get the minimal data needed to render an OpenGraph preview image for a list.
 *
 * Separate from `getBySlug` so the OG-specific shape can evolve independently.
 * This query runs unauthenticated at crawl time, so private lists intentionally
 * return `status: "private"` — never leak member-only content to crawlers.
 *
 * Returns one of:
 *   { status: "ok", list, owner, upcomingEvents }  — 0–3 upcoming events, chronological
 *   { status: "private" }
 *   { status: "notFound" }
 */
export const getOgData = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      status: v.literal("ok"),
      list: v.object({
        name: v.string(),
        eventCount: v.number(),
      }),
      owner: v.object({
        username: v.string(),
        displayName: v.string(),
        userImage: v.string(),
        emoji: v.union(v.string(), v.null()),
      }),
      upcomingEvents: v.array(
        v.object({
          image: v.string(),
        }),
      ),
    }),
    v.object({ status: v.literal("private") }),
    v.object({ status: v.literal("notFound") }),
  ),
  handler: async (ctx, { slug }) => {
    const list = await ctx.db
      .query("lists")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!list) {
      return { status: "notFound" as const };
    }

    const viewerId = await getUserId(ctx);
    const accessResult = await checkListAccess(ctx, list.id, viewerId);

    if (accessResult.status === "notFound") {
      return { status: "notFound" as const };
    }

    if (accessResult.status !== "ok") {
      return { status: "private" as const };
    }

    // Bounded per Convex's `.take()`-over-`.collect()` rule (see
    // packages/backend/.cursor/rules/convex_rules.mdc). `.order("desc")` scans
    // the most-recently-added memberships first — upcoming events are far
    // more likely to be in the tail of the insertion order than the head, so
    // this prevents older-only lists from falling back to the branded
    // default. The pill count below is still derived from this slice, so
    // lists with >500 upcoming-public events show an approximate count; a
    // denormalized counter updated by list mutations would be the rigorous
    // fix if/when that becomes visible.
    const OG_EVENT_SCAN_LIMIT = 500;
    const [owner, eventToLists] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_custom_id", (q) => q.eq("id", list.userId))
        .first(),
      ctx.db
        .query("eventToLists")
        .withIndex("by_list", (q) => q.eq("listId", list.id))
        .order("desc")
        .take(OG_EVENT_SCAN_LIMIT),
    ]);

    if (!owner) {
      return { status: "notFound" as const };
    }

    const nowIso = new Date().toISOString();
    const events = await Promise.all(
      eventToLists.map((etl) =>
        ctx.db
          .query("events")
          .withIndex("by_custom_id", (q) => q.eq("id", etl.eventId))
          .unique(),
      ),
    );

    // Pill count reports the *upcoming* count so it aligns with what the
    // preview promises (the screenshots are upcoming events).
    const upcomingPublic = events
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .filter((e) => e.visibility !== "private")
      .filter((e) => e.startDateTime >= nowIso)
      .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));

    const upcomingEvents = upcomingPublic
      .filter((e) => isLikelyHttpUrl(e.image))
      .slice(0, 3)
      .map((e) => ({ image: e.image! }));

    return {
      status: "ok" as const,
      list: { name: list.name, eventCount: upcomingPublic.length },
      owner: {
        username: owner.username,
        displayName: owner.displayName,
        userImage: owner.userImage,
        emoji: owner.emoji,
      },
      upcomingEvents,
    };
  },
});
