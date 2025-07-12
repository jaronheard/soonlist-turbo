import { ConvexError, v } from "convex/values";

import type { DatabaseReader } from "./_generated/server";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { onboardingDataValidator, userAdditionalInfoValidator } from "./schema";

const MAX_USERNAME_LENGTH = 64;

/**
 * Generate a unique username based on user's name or email
 * Uses slug-like generation: tries simplest form first, then adds numbers
 */
async function generateUniqueUsername(
  db: DatabaseReader,
  firstName?: string | null,
  lastName?: string | null,
  email?: string,
): Promise<string> {
  // Clean and format names for username (slug-like)
  const slugify = (text: string | null | undefined) => {
    if (!text) return "";
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      .replace(/-+/g, "-"); // Replace multiple hyphens with single
  };

  const cleanFirst = slugify(firstName);
  const cleanLast = slugify(lastName);
  const emailPrefix = email ? slugify(email.split("@")[0]) : "";

  // Create a list of username candidates in order of preference
  const candidates: string[] = [];

  // 1. Try just firstname (most common for social platforms)
  if (cleanFirst) {
    candidates.push(cleanFirst);
  }

  // 2. Try firstname + lastname variations
  if (cleanFirst && cleanLast) {
    candidates.push(`${cleanFirst}${cleanLast}`); // johnsmith
    candidates.push(`${cleanFirst}-${cleanLast}`); // john-smith
    candidates.push(`${cleanFirst}.${cleanLast}`); // john.smith
    candidates.push(`${cleanFirst}_${cleanLast}`); // john_smith
  }

  // 3. Try just lastname
  if (cleanLast) {
    candidates.push(cleanLast);
  }

  // 4. Try email prefix
  if (emailPrefix && emailPrefix !== cleanFirst && emailPrefix !== cleanLast) {
    candidates.push(emailPrefix);
  }

  // 5. Try combinations with first initial
  if (cleanFirst && cleanLast) {
    candidates.push(`${cleanFirst[0]}${cleanLast}`); // jsmith
    candidates.push(`${cleanFirst[0]}-${cleanLast}`); // j-smith
  }

  // Filter candidates by length and ensure minimum length
  const validCandidates = candidates
    .filter(
      (username) =>
        username.length >= 3 && username.length <= MAX_USERNAME_LENGTH,
    )
    .slice(0, 10); // Limit to first 10 candidates

  // Batch check all candidates at once
  if (validCandidates.length > 0) {
    const existingUsers = await Promise.all(
      validCandidates.map((username) =>
        db
          .query("users")
          .withIndex("by_username", (q) => q.eq("username", username))
          .unique(),
      ),
    );

    const takenUsernames = new Set(
      existingUsers.filter(Boolean).map((u) => u!.username),
    );

    // Return first available candidate
    for (const candidate of validCandidates) {
      if (!takenUsernames.has(candidate)) {
        return candidate;
      }
    }
  }

  // If all candidates are taken, add numbers to the best candidate
  const baseUsername = validCandidates[0] || "user";

  // Ensure base username with numbers fits within limit
  const maxNumberLength = MAX_USERNAME_LENGTH - baseUsername.length - 1; // -1 for the number
  if (maxNumberLength > 0) {
    const maxNumber = Math.pow(10, maxNumberLength) - 1;

    // Batch check numbered usernames (1-99)
    const numberedCandidates: string[] = [];
    for (let i = 1; i < 100 && i <= maxNumber; i++) {
      numberedCandidates.push(`${baseUsername}${i}`);
    }

    if (numberedCandidates.length > 0) {
      const existingNumbered = await Promise.all(
        numberedCandidates.map((username) =>
          db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", username))
            .unique(),
        ),
      );

      const takenNumbered = new Set(
        existingNumbered.filter(Boolean).map((u) => u!.username),
      );

      for (const candidate of numberedCandidates) {
        if (!takenNumbered.has(candidate)) {
          return candidate;
        }
      }
    }
  }

  // Ultimate fallback: use timestamp (ensure it fits)
  const timestamp = Date.now().toString();
  const fallbackUsername = `${baseUsername}${timestamp}`;

  if (fallbackUsername.length <= MAX_USERNAME_LENGTH) {
    return fallbackUsername;
  }

  // If even timestamp is too long, truncate the base and add timestamp
  const truncatedBase = baseUsername.substring(
    0,
    MAX_USERNAME_LENGTH - timestamp.length,
  );
  return `${truncatedBase}${timestamp}`;
}

/**
 * Generate a unique username - requires guest authentication
 */
export const generateUsername = query({
  args: {
    guestUserId: v.string(),
    firstName: v.optional(v.union(v.string(), v.null())),
    lastName: v.optional(v.union(v.string(), v.null())),
    email: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Validate guest user ID format
    if (!args.guestUserId || !args.guestUserId.startsWith("guest_")) {
      throw new ConvexError("Valid guest user ID required for username generation");
    }

    return await generateUniqueUsername(
      ctx.db,
      args.firstName,
      args.lastName,
      args.email,
    );
  },
});

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

    // Delete user from Clerk first
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new ConvexError("Clerk secret key not configured");
    }

    try {
      const response = await fetch(
        `https://api.clerk.com/v1/users/${args.userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new ConvexError(
          `Failed to delete user from Clerk: ${response.status} ${error}`,
        );
      }
    } catch (error) {
      // If it's already a ConvexError, re-throw it
      if (error instanceof ConvexError) {
        throw error;
      }
      // For other errors (network, etc.), wrap in ConvexError
      throw new ConvexError(
        `Failed to delete user from Clerk: ${String(error)}`,
      );
    }

    // Use the new centralized cascade delete mutation
    await ctx.runMutation(internal.users.deleteUserAndCascade, {
      userId: args.userId,
    });

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

    // Username must be set during signup - fail if missing
    const username = args.username;
    if (!username || username.trim() === "") {
      throw new ConvexError({
        message: "Username is required for user creation",
        data: {
          userId: args.id,
          email: args.email,
          firstName: args.firstName,
          lastName: args.lastName,
        },
      });
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
    // Use the new centralized cascade delete mutation
    await ctx.runMutation(internal.users.deleteUserAndCascade, {
      userId: args.id,
    });
  },
});

/**
 * INTERNAL: Centralized cascade deletion logic for a user.
 * This function should be called by other mutations that need to delete a user.
 */
export const deleteUserAndCascade = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.userId))
      .unique();

    if (!user) {
      console.warn(`User ${args.userId} not found for deletion`);
      return;
    }

    // Delete events created by user and their cascade dependencies
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const event of events) {
      // Delete comments on this event (by all users)
      const eventComments = await ctx.db
        .query("comments")
        .withIndex("by_event", (q) => q.eq("eventId", event.id))
        .collect();
      for (const comment of eventComments) {
        await ctx.db.delete(comment._id);
      }

      // Delete follows of this event (by all users)
      const eventFollowsOfEvent = await ctx.db
        .query("eventFollows")
        .withIndex("by_event", (q) => q.eq("eventId", event.id))
        .collect();
      for (const follow of eventFollowsOfEvent) {
        await ctx.db.delete(follow._id);
      }

      // Delete eventToLists associations for this event
      const eventToListsOfEvent = await ctx.db
        .query("eventToLists")
        .withIndex("by_event", (q) => q.eq("eventId", event.id))
        .collect();
      for (const etl of eventToListsOfEvent) {
        await ctx.db.delete(etl._id);
      }

      // Delete the event itself
      await ctx.db.delete(event._id);
    }

    // Delete comments by user (on other users' events)
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // Delete lists created by user and their cascade dependencies
    const lists = await ctx.db
      .query("lists")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const list of lists) {
      // Delete follows of this list (by all users)
      const listFollowsOfList = await ctx.db
        .query("listFollows")
        .withIndex("by_list", (q) => q.eq("listId", list.id))
        .collect();
      for (const follow of listFollowsOfList) {
        await ctx.db.delete(follow._id);
      }

      // Delete eventToLists associations for this list
      const eventToListsOfList = await ctx.db
        .query("eventToLists")
        .withIndex("by_list", (q) => q.eq("listId", list.id))
        .collect();
      for (const etl of eventToListsOfList) {
        await ctx.db.delete(etl._id);
      }

      // Delete the list itself
      await ctx.db.delete(list._id);
    }

    // Delete event follows by user (follows of other users' events)
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const follow of eventFollows) {
      await ctx.db.delete(follow._id);
    }

    // Delete list follows by user (follows of other users' lists)
    const listFollows = await ctx.db
      .query("listFollows")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const follow of listFollows) {
      await ctx.db.delete(follow._id);
    }

    // Delete push tokens
    const pushTokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const token of pushTokens) {
      await ctx.db.delete(token._id);
    }

    // Delete event batches
    const eventBatches = await ctx.db
      .query("eventBatches")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const batch of eventBatches) {
      await ctx.db.delete(batch._id);
    }

    // Delete user feeds
    const userFeeds = await ctx.db
      .query("userFeeds")
      .filter((q) => q.eq(q.field("feedId"), `user_${args.userId}`))
      .collect();
    for (const feed of userFeeds) {
      await ctx.db.delete(feed._id);
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
    for (const follow of [...followsAsFollower, ...followsAsFollowing]) {
      await ctx.db.delete(follow._id);
    }

    // Finally, delete the user record
    await ctx.db.delete(user._id);
  },
});
