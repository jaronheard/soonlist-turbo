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
import {
  addEventToListFeedInline,
  listFeedId,
  removeEventFromListFeedInline,
} from "./feedHelpers";
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
    // New lists never need the backfill fallback — the write path
    // (addEventToList → addEventToListFeedInline) keeps the list feed in
    // lockstep with eventToLists from day one.
    feedBackfilledAt: new Date().toISOString(),
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
        feedBackfilledAt: v.optional(v.string()),
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
 * Get contributors (non-owner members with role="contributor") for a list.
 *
 * Used by the list detail hero to show who has captured events into the list,
 * mirroring the "From these Soonlists" attribution on event detail (owner is
 * the creator-equivalent, contributors are the savers-equivalent).
 *
 * Returns a bounded slice of UserForDisplay-shaped users. Respects list
 * access rules — private lists only yield contributors to authorized viewers.
 */
export const getContributorsForList = query({
  args: {
    slug: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      username: v.string(),
      displayName: v.string(),
      userImage: v.string(),
    }),
  ),
  handler: async (ctx, { slug, limit = 20 }) => {
    const list = await ctx.db
      .query("lists")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!list) {
      return [];
    }

    const viewerId = await getUserId(ctx);
    const access = await checkListAccess(ctx, list.id, viewerId);
    if (access.status !== "ok") {
      return [];
    }

    const members = await ctx.db
      .query("listMembers")
      .withIndex("by_list_and_role", (q) =>
        q.eq("listId", list.id).eq("role", "contributor"),
      )
      .take(limit);

    const users = await Promise.all(
      members.map((m) =>
        ctx.db
          .query("users")
          .withIndex("by_custom_id", (q) => q.eq("id", m.userId))
          .first(),
      ),
    );

    return users
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        userImage: u.userImage,
      }));
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

        // Keep the list's own feed (list_${listId}) in sync with eventToLists.
        await removeEventFromListFeedInline(ctx, entry.eventId, listId);

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

        // Maintain the list's own feed (list_${listId}) inline in this
        // batch — addEventToListFeedInline is a single upsert on userFeeds
        // and stays well within the per-mutation transaction budget.
        await addEventToListFeedInline(ctx, event.id, listId);

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
 * Enrich a page of raw event docs with user / follows / lists data and
 * strip lists the viewer can't see — shared by both the feed-backed path
 * and the backfill-window fallback so they return the same shape.
 */
async function enrichListEventsForViewer(
  ctx: QueryCtx,
  events: Doc<"events">[],
  viewerId: string | null,
) {
  const enrichedEvents = await enrichEventsAndFilterNulls(ctx, events);

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
  return enrichedEvents.map((event) => ({
    ...event,
    lists: (event.lists ?? []).filter((l) => viewableListIds.has(l.id)),
  }));
}

/**
 * Continuation cursors emitted by the backfill-window fallback are tagged
 * with this prefix so the next paginate call routes back to the fallback
 * path. Without it, page 2 would feed an `eventToLists` cursor into the
 * `userFeeds` index — Convex would reject it as an invalid cursor.
 */
const FALLBACK_CURSOR_PREFIX = "etl:";

function isFallbackCursor(cursor: string | null): cursor is string {
  return cursor?.startsWith(FALLBACK_CURSOR_PREFIX) ?? false;
}

/**
 * Backfill-window fallback: paginate `eventToLists` directly and filter
 * events in memory. Reproduces the pre-feed behavior — sparse pages and
 * all — but only fires when `list_${listId}` has zero `userFeeds` entries
 * for a list that still has membership rows. The migration drains this
 * branch into the feed; once it completes for a list the dense feed path
 * takes over.
 *
 * Once a request enters this path, every subsequent page must stay on it —
 * the returned `continueCursor` is wrapped with `FALLBACK_CURSOR_PREFIX`
 * and the main handler re-routes wrapped cursors back here.
 */
async function getEventsForListBackfillFallback(
  ctx: QueryCtx,
  listId: string,
  paginationOpts: { numItems: number; cursor: string | null },
  filter: "upcoming" | "past",
  viewerId: string | null,
) {
  const eventToLists = await ctx.db
    .query("eventToLists")
    .withIndex("by_list", (q) => q.eq("listId", listId))
    .paginate(paginationOpts);

  const events = await Promise.all(
    eventToLists.page.map((etl) =>
      ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", etl.eventId))
        .unique(),
    ),
  );

  const referenceDateTime = new Date().toISOString();
  const visibleEvents = events
    .filter((event): event is NonNullable<typeof event> => event !== null)
    .filter((event) => event.visibility !== "private")
    .filter((event) =>
      filter === "upcoming"
        ? event.endDateTime >= referenceDateTime
        : event.endDateTime < referenceDateTime,
    );

  return {
    ...eventToLists,
    // Tag the cursor only when there's more data to fetch; once isDone the
    // client won't call back, so leave the original (possibly empty) value.
    continueCursor: eventToLists.isDone
      ? eventToLists.continueCursor
      : `${FALLBACK_CURSOR_PREFIX}${eventToLists.continueCursor}`,
    page: await enrichListEventsForViewer(ctx, visibleEvents, viewerId),
  };
}

/**
 * Get events for a list by slug.
 *
 * Paginates the list's dedicated feed (`list_${listId}`) in `userFeeds` so
 * every page comes back densely filled with matching events — previously we
 * paginated the `eventToLists` junction and then discarded past/private
 * events, which produced sparse pages on large lists.
 *
 * Write-path wiring that keeps the feed in sync lives in `feedHelpers.ts`
 * (`addEventToListFeedInline` / `removeEventFromListFeedInline` /
 * `removeListFeedAction`). Existing `eventToLists` rows are backfilled by
 * `migrations/backfillListFeeds.ts`; lists not yet reached by the migration
 * fall back to a legacy scan so the deploy window doesn't show empty lists.
 */
export const getEventsForList = query({
  args: {
    slug: v.string(),
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
  },
  handler: async (ctx, { slug, paginationOpts, filter = "upcoming" }) => {
    const emptyResults = async () => {
      // Pass a null cursor rather than the incoming one: the page is empty
      // anyway (isDone=true), and a tagged fallback cursor (`etl:...`) or
      // any stale cursor from a deleted/inaccessible list would otherwise
      // be rejected by `userFeeds.paginate` as invalid.
      const emptyPage = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_hasEnded_startTime", (q) =>
          q.eq("feedId", "__missing_list__"),
        )
        .paginate({ numItems: paginationOpts.numItems, cursor: null });
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

    // If the previous page came from the backfill fallback, its cursor is
    // tagged so we stay on the same path — feeding an `eventToLists`
    // cursor into the `userFeeds` index would fail.
    if (isFallbackCursor(paginationOpts.cursor)) {
      return getEventsForListBackfillFallback(
        ctx,
        list.id,
        {
          numItems: paginationOpts.numItems,
          cursor: paginationOpts.cursor.slice(FALLBACK_CURSOR_PREFIX.length),
        },
        filter,
        viewerId,
      );
    }

    // Backfill-window safety: a list is only known to have its `list_*`
    // feed fully mirrored from `eventToLists` once `list.feedBackfilledAt`
    // is populated. New lists set this at creation; pre-existing lists get
    // it set by `migrations/backfillListFeeds.runBackfillListFeeds`. When
    // the marker is absent we fall back to the junction scan unconditionally
    // — the feed may already have some entries (partial migration) but we
    // can't trust that they're complete, so returning a partial first page
    // would silently hide unmigrated events.
    //
    // Gated on cursor=null because subsequent pages within a fallback run
    // already route via `isFallbackCursor` above.
    if (paginationOpts.cursor === null && !list.feedBackfilledAt) {
      return getEventsForListBackfillFallback(
        ctx,
        list.id,
        paginationOpts,
        filter,
        viewerId,
      );
    }

    const feedId = listFeedId(list.id);
    const hasEnded = filter === "past";
    const order = filter === "upcoming" ? "asc" : "desc";

    // Filter + sort at the index BEFORE paginating so every page is densely
    // populated with matching events (no sparse pages from post-filtering).
    // `eventVisibility` is pinned to "public" to mirror the previous
    // behavior of dropping private events from list detail views.
    const feedResults = await ctx.db
      .query("userFeeds")
      .withIndex("by_feed_visibility_hasEnded_startTime", (q) =>
        q
          .eq("feedId", feedId)
          .eq("eventVisibility", "public")
          .eq("hasEnded", hasEnded),
      )
      .order(order)
      .paginate(paginationOpts);

    const events = await Promise.all(
      feedResults.page.map((entry) =>
        ctx.db
          .query("events")
          .withIndex("by_custom_id", (q) => q.eq("id", entry.eventId))
          .unique(),
      ),
    );

    const hydratedEvents = events.filter(
      (event): event is NonNullable<typeof event> => event !== null,
    );

    return {
      ...feedResults,
      page: await enrichListEventsForViewer(ctx, hydratedEvents, viewerId),
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

// Only return images hosted on our Bytescale account. @vercel/og (satori)
// only decodes PNG/JPEG, and the OG route relies on Bytescale's `/image/`
// processor with `f=jpg` to transcode WebP origin bytes — a trick that only
// works for URLs on our account. External WebP URLs (scraped from other
// CDNs) would fail satori's image fetch and crash the entire render.
const OUR_BYTESCALE_URL_PREFIX = "https://upcdn.io/12a1yek/";
function isRenderableEventImage(value: unknown): value is string {
  return (
    typeof value === "string" && value.startsWith(OUR_BYTESCALE_URL_PREFIX)
  );
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
      .filter((e) => isRenderableEventImage(e.image))
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
