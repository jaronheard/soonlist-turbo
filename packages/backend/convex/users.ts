import { ConvexError, v } from "convex/values";

import type { DatabaseReader } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { onboardingDataValidator, userAdditionalInfoValidator } from "./schema";

/**
 * Generate a unique username based on user's name or email
 * Format: firstname-lastname-random (e.g., jaron-heard-742)
 */
async function generateUniqueUsername(
  db: DatabaseReader,
  firstName?: string | null,
  lastName?: string | null,
  email?: string,
): Promise<string> {
  // Clean and format names for username
  const cleanName = (name: string | null | undefined) => {
    if (!name) return "";
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-") // Replace special chars with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  };

  const cleanFirst = cleanName(firstName);
  const cleanLast = cleanName(lastName);

  // Try different username formats
  let baseUsername: string;

  if (cleanFirst && cleanLast) {
    // Prefer firstname-lastname format
    baseUsername = `${cleanFirst}-${cleanLast}`;
  } else if (cleanFirst) {
    // Just first name
    baseUsername = cleanFirst;
  } else if (cleanLast) {
    // Just last name
    baseUsername = cleanLast;
  } else if (email) {
    // Fallback to email prefix
    const emailPrefix = email.split("@")[0];
    baseUsername = cleanName(emailPrefix) || "user";
  } else {
    // Ultimate fallback
    baseUsername = "user";
  }

  // Ensure minimum length
  if (baseUsername.length < 3) {
    baseUsername = baseUsername.padEnd(3, "0");
  }

  // Check if base username is available
  const existingBase = await db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", baseUsername))
    .unique();

  if (!existingBase) {
    return baseUsername;
  }

  // Add random numbers until we find a unique one
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const randomNum = Math.floor(Math.random() * 9000) + 100; // 3-digit number (100-9099)
    const candidateUsername = `${baseUsername}-${randomNum}`;

    const existing = await db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", candidateUsername))
      .unique();

    if (!existing) {
      return candidateUsername;
    }

    attempts++;
  }

  // Fallback: use timestamp if we couldn't find a unique username
  return `${baseUsername}-${Date.now()}`;
}

/**
 * Get a user by their ID
 */
export const getById = query({
  args: { id: v.string() },
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
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.userName))
      .unique();
    return user || null;
  },
});

/**
 * Get the current authenticated user
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", identity.subject))
      .unique();
    return user || null;
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User must be logged in to update profile",
        data: { args },
      });
    }

    // Verify that the authenticated user's ID matches the userId being updated
    if (identity.subject !== args.userId) {
      throw new ConvexError({
        message: "Unauthorized: You can only update your own profile",
        data: {
          authenticatedUserId: identity.subject,
          requestedUserId: args.userId,
        },
      });
    }

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
 * Save onboarding data for a user
 */
export const saveOnboardingData = mutation({
  args: {
    userId: v.string(),
    ...onboardingDataValidator.fields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User must be logged in to save onboarding data",
        data: { args },
      });
    }

    // Verify that the authenticated user's ID matches the userId being updated
    if (identity.subject !== args.userId) {
      throw new ConvexError({
        message: "Unauthorized: You can only update your own onboarding data",
        data: {
          authenticatedUserId: identity.subject,
          requestedUserId: args.userId,
        },
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.userId))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Get existing onboarding data - now properly typed
    const existingData = user.onboardingData || {};

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

    return null;
  },
});

/**
 * Get onboarding data for a user
 */
export const getOnboardingData = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.userId))
      .unique();

    if (!user) {
      return null;
    }

    return user.onboardingData;
  },
});

/**
 * Delete a user account and all related data
 */
export const deleteAccount = mutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError("User not authenticated");
    }

    // Verify that the authenticated user's ID matches the userId being deleted
    if (identity.subject !== args.userId) {
      throw new ConvexError("User not authorized to delete this account");
    }

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

    return null;
  },
});

/**
 * Reset onboarding for a user
 */
export const resetOnboarding = mutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User must be logged in to reset onboarding",
        data: { args },
      });
    }

    // Verify that the authenticated user's ID matches the userId being updated
    if (identity.subject !== args.userId) {
      throw new ConvexError({
        message: "Unauthorized: You can only reset your own onboarding",
        data: {
          authenticatedUserId: identity.subject,
          requestedUserId: args.userId,
        },
      });
    }

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

    return null;
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User must be logged in to set onboarding completion",
        data: { args },
      });
    }

    // Verify that the authenticated user's ID matches the userId being updated
    if (identity.subject !== args.userId) {
      throw new ConvexError({
        message: "Unauthorized: You can only update your own onboarding status",
        data: {
          authenticatedUserId: identity.subject,
          requestedUserId: args.userId,
        },
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.userId))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Update onboarding data to include completedAt - now properly typed
    const existingData = user.onboardingData || {};
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

/**
 * Internal mutation to sync user data from Clerk webhook
 */
export const syncFromClerk = internalMutation({
  args: {
    id: v.string(),
    username: v.string(),
    email: v.string(),
    displayName: v.string(),
    userImage: v.string(),
    publicMetadata: v.optional(v.object({})),
    firstName: v.optional(v.union(v.string(), v.null())),
    lastName: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.id))
      .unique();

    // Generate username if not provided or empty
    let username = args.username;
    if (!username || username.trim() === "") {
      username = await generateUniqueUsername(
        ctx.db,
        args.firstName,
        args.lastName,
        args.email,
      );
    }

    const userData = {
      id: args.id,
      username,
      email: args.email,
      displayName: args.displayName,
      userImage: args.userImage,
      publicMetadata: args.publicMetadata || {},
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      // Only update username if the user doesn't already have one
      if (existing.username && existing.username.trim() !== "") {
        const { username: _, ...userDataWithoutUsername } = userData;
        await ctx.db.patch(existing._id, userDataWithoutUsername);
        return;
      }
      await ctx.db.patch(existing._id, userData);
    } else {
      await ctx.db.insert("users", {
        ...userData,
        created_at: new Date().toISOString(),
        bio: null,
        publicEmail: null,
        publicPhone: null,
        publicInsta: null,
        publicWebsite: null,
        emoji: null,
        onboardingData: null,
        onboardingCompletedAt: null,
      });
    }
  },
});

/**
 * Internal mutation to delete user from Clerk webhook
 */
export const deleteUser = internalMutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.id))
      .unique();

    if (!user) {
      console.warn(`User ${args.id} not found for deletion`);
      return;
    }

    // Delete user follows (both as follower and following)
    const followsAsFollower = await ctx.db
      .query("userFollows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.id))
      .collect();

    const followsAsFollowing = await ctx.db
      .query("userFollows")
      .withIndex("by_following", (q) => q.eq("followingId", args.id))
      .collect();

    // Delete all follow relationships
    for (const follow of [...followsAsFollower, ...followsAsFollowing]) {
      await ctx.db.delete(follow._id);
    }

    // Delete the user record
    await ctx.db.delete(user._id);
  },
});
