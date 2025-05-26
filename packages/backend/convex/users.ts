import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";

// Helper function to normalize emoji (same as in tRPC router)
function normalizeEmoji(emoji: string | null): string {
  if (!emoji) return "";
  return emoji
    .toString()
    .replace(/[\uFE00-\uFE0F]/g, "")
    .normalize("NFC");
}

// Validators for complex types
const priorityValidator = v.object({
  text: v.string(),
  emoji: v.string(),
});

const onboardingDataValidator = v.object({
  notificationsEnabled: v.optional(v.boolean()),
  ageRange: v.optional(
    v.union(
      v.literal("Under 24"),
      v.literal("25-34"),
      v.literal("35-44"),
      v.literal("45-54"),
      v.literal("55-64"),
      v.literal("65+"),
    ),
  ),
  source: v.optional(v.string()),
  discoveryMethod: v.optional(v.string()),
  screenshotEvents: v.optional(v.string()),
  priority: v.optional(priorityValidator),
});

const userAdditionalInfoValidator = v.object({
  bio: v.optional(v.string()),
  publicEmail: v.optional(v.string()),
  publicPhone: v.optional(v.string()),
  publicInsta: v.optional(v.string()),
  publicWebsite: v.optional(v.string()),
});

/**
 * Get a user by their ID
 */
export const getById = query({
  args: { id: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      id: v.string(),
      username: v.string(),
      email: v.string(),
      displayName: v.string(),
      userImage: v.string(),
      bio: v.union(v.string(), v.null()),
      publicEmail: v.union(v.string(), v.null()),
      publicPhone: v.union(v.string(), v.null()),
      publicInsta: v.union(v.string(), v.null()),
      publicWebsite: v.union(v.string(), v.null()),
      publicMetadata: v.union(v.any(), v.null()),
      emoji: v.union(v.string(), v.null()),
      onboardingData: v.union(v.any(), v.null()),
      onboardingCompletedAt: v.union(v.string(), v.null()),
      created_at: v.string(),
      updatedAt: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.id))
      .unique();
    return user || null;
  },
});

/**
 * Get a user by their username
 */
export const getByUsername = query({
  args: { userName: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      id: v.string(),
      username: v.string(),
      email: v.string(),
      displayName: v.string(),
      userImage: v.string(),
      bio: v.union(v.string(), v.null()),
      publicEmail: v.union(v.string(), v.null()),
      publicPhone: v.union(v.string(), v.null()),
      publicInsta: v.union(v.string(), v.null()),
      publicWebsite: v.union(v.string(), v.null()),
      publicMetadata: v.union(v.any(), v.null()),
      emoji: v.union(v.string(), v.null()),
      onboardingData: v.union(v.any(), v.null()),
      onboardingCompletedAt: v.union(v.string(), v.null()),
      created_at: v.string(),
      updatedAt: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.userName))
      .unique();
    return user || null;
  },
});

/**
 * Get all users ordered by username
 */
export const getAll = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      id: v.string(),
      username: v.string(),
      email: v.string(),
      displayName: v.string(),
      userImage: v.string(),
      bio: v.union(v.string(), v.null()),
      publicEmail: v.union(v.string(), v.null()),
      publicPhone: v.union(v.string(), v.null()),
      publicInsta: v.union(v.string(), v.null()),
      publicWebsite: v.union(v.string(), v.null()),
      publicMetadata: v.union(v.any(), v.null()),
      emoji: v.union(v.string(), v.null()),
      onboardingData: v.union(v.any(), v.null()),
      onboardingCompletedAt: v.union(v.string(), v.null()),
      created_at: v.string(),
      updatedAt: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, _args) => {
    const users = await ctx.db.query("users").collect();
    // Sort by username since Convex doesn't have built-in sorting on non-indexed fields
    return users.sort((a, b) => a.username.localeCompare(b.username));
  },
});

/**
 * Get users that a given user is following
 */
export const getFollowing = query({
  args: { userName: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      id: v.string(),
      username: v.string(),
      email: v.string(),
      displayName: v.string(),
      userImage: v.string(),
      bio: v.union(v.string(), v.null()),
      publicEmail: v.union(v.string(), v.null()),
      publicPhone: v.union(v.string(), v.null()),
      publicInsta: v.union(v.string(), v.null()),
      publicWebsite: v.union(v.string(), v.null()),
      publicMetadata: v.union(v.any(), v.null()),
      emoji: v.union(v.string(), v.null()),
      onboardingData: v.union(v.any(), v.null()),
      onboardingCompletedAt: v.union(v.string(), v.null()),
      created_at: v.string(),
      updatedAt: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    // First get the user by username
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.userName))
      .unique();

    if (!user) {
      return [];
    }

    // Get all user follows where this user is the follower
    const userFollowRecords = await ctx.db
      .query("userFollows")
      .withIndex("by_follower", (q) => q.eq("followerId", user.id))
      .collect();

    if (userFollowRecords.length === 0) {
      return [];
    }

    // Get all the users being followed
    const followingUsers = [];
    for (const followRecord of userFollowRecords) {
      const followingUser = await ctx.db
        .query("users")
        .withIndex("by_custom_id", (q) => q.eq("id", followRecord.followingId))
        .unique();
      if (followingUser) {
        followingUsers.push(followingUser);
      }
    }

    return followingUsers;
  },
});

/**
 * Check if one user is following another
 */
export const getIfFollowing = query({
  args: {
    followerId: v.string(),
    followingId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const followRecord = await ctx.db
      .query("userFollows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", args.followingId),
      )
      .unique();

    return followRecord !== null;
  },
});

/**
 * Follow a user (requires authentication context)
 */
export const follow = mutation({
  args: {
    followerId: v.string(),
    followingId: v.string(),
  },
  returns: v.id("userFollows"),
  handler: async (ctx, args) => {
    // Check if already following
    const existingFollow = await ctx.db
      .query("userFollows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", args.followingId),
      )
      .unique();

    if (existingFollow) {
      throw new ConvexError("Already following this user");
    }

    return await ctx.db.insert("userFollows", {
      followerId: args.followerId,
      followingId: args.followingId,
    });
  },
});

/**
 * Unfollow a user (requires authentication context)
 */
export const unfollow = mutation({
  args: {
    followerId: v.string(),
    followingId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const followRecord = await ctx.db
      .query("userFollows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", args.followingId),
      )
      .unique();

    if (!followRecord) {
      throw new ConvexError("Not following this user");
    }

    await ctx.db.delete(followRecord._id);
    return null;
  },
});

/**
 * Update user additional info (bio, public contact info)
 */
export const updateAdditionalInfo = mutation({
  args: {
    userId: v.string(),
    ...userAdditionalInfoValidator.fields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.userId))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    await ctx.db.patch(user._id, {
      bio: args.bio || null,
      publicEmail: args.publicEmail || null,
      publicPhone: args.publicPhone || null,
      publicInsta: args.publicInsta || null,
      publicWebsite: args.publicWebsite || null,
      updatedAt: new Date().toISOString(),
    });

    return null;
  },
});

/**
 * Update user emoji
 */
export const updateEmoji = mutation({
  args: {
    userId: v.string(),
    emoji: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.userId))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const normalizedEmoji = normalizeEmoji(args.emoji);

    // Check if emoji is already taken by another user
    if (normalizedEmoji) {
      const existingUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("emoji"), normalizedEmoji))
        .first();

      if (existingUser && existingUser.id !== args.userId) {
        throw new ConvexError("This emoji is already in use by another user");
      }
    }

    await ctx.db.patch(user._id, {
      emoji: normalizedEmoji || null,
      updatedAt: new Date().toISOString(),
    });

    return null;
  },
});

/**
 * Get all taken emojis
 */
export const getAllTakenEmojis = query({
  args: {},
  returns: v.object({
    takenEmojis: v.array(v.string()),
  }),
  handler: async (ctx, _args) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("emoji"), null))
      .collect();

    const takenEmojis = users
      .map((user) => user.emoji)
      .filter((emoji): emoji is string => emoji !== null && emoji !== "");

    return { takenEmojis };
  },
});

/**
 * Save onboarding data for a user
 */
export const saveOnboardingData = mutation({
  args: {
    userId: v.string(),
    ...onboardingDataValidator.fields,
  },
  returns: v.object({
    notificationsEnabled: v.optional(v.boolean()),
    ageRange: v.optional(v.string()),
    source: v.optional(v.string()),
    discoveryMethod: v.optional(v.string()),
    screenshotEvents: v.optional(v.string()),
    priority: v.optional(priorityValidator),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.userId))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Get existing onboarding data
    const existingData = (user.onboardingData as Record<string, unknown>) || {};

    // Merge existing data with new data
    const { userId: _, ...newData } = args;
    const mergedData = {
      ...existingData,
      ...newData,
    };

    await ctx.db.patch(user._id, {
      onboardingData: mergedData,
      updatedAt: new Date().toISOString(),
    });

    return mergedData as {
      notificationsEnabled?: boolean;
      ageRange?: string;
      source?: string;
      discoveryMethod?: string;
      screenshotEvents?: string;
      priority?: { text: string; emoji: string };
    };
  },
});

/**
 * Get onboarding data for a user
 */
export const getOnboardingData = query({
  args: { userId: v.string() },
  returns: v.object({
    notificationsEnabled: v.optional(v.boolean()),
    ageRange: v.optional(v.string()),
    source: v.optional(v.string()),
    discoveryMethod: v.optional(v.string()),
    screenshotEvents: v.optional(v.string()),
    priority: v.optional(priorityValidator),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.userId))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    return user.onboardingData as {
      notificationsEnabled?: boolean;
      ageRange?: string;
      source?: string;
      discoveryMethod?: string;
      screenshotEvents?: string;
      priority?: { text: string; emoji: string };
    };
  },
});

/**
 * Delete a user account and all related data
 */
export const deleteAccount = mutation({
  args: { userId: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.userId))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Delete user follows (both as follower and following)
    const followsAsFollower = await ctx.db
      .query("userFollows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    const followsAsFollowing = await ctx.db
      .query("userFollows")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .collect();

    // Delete all follow relationships
    for (const follow of [...followsAsFollower, ...followsAsFollowing]) {
      await ctx.db.delete(follow._id);
    }

    // Delete the user record
    await ctx.db.delete(user._id);

    return { success: true };
  },
});

/**
 * Reset onboarding for a user
 */
export const resetOnboarding = mutation({
  args: { userId: v.string() },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.userId))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    await ctx.db.patch(user._id, {
      onboardingCompletedAt: null,
      onboardingData: null,
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Onboarding reset successfully",
    };
  },
});

/**
 * Set onboarding completed timestamp
 */
export const setOnboardingCompletedAt = mutation({
  args: {
    userId: v.string(),
    completedAt: v.string(), // ISO date string
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.userId))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Update onboarding data to include completedAt
    const existingData = (user.onboardingData as Record<string, unknown>) || {};
    const updatedData = {
      ...existingData,
      completedAt: args.completedAt,
    };

    await ctx.db.patch(user._id, {
      onboardingCompletedAt: args.completedAt,
      onboardingData: updatedData,
      updatedAt: new Date().toISOString(),
    });

    return null;
  },
});
