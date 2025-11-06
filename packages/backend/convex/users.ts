import { paginationOptsValidator } from "convex/server";
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
  console.log("[USERNAME_GEN] Starting username generation", {
    firstName: firstName ? `"${firstName}"` : null,
    lastName: lastName ? `"${lastName}"` : null,
    email: email ? `"${email}"` : null,
    timestamp: new Date().toISOString(),
  });

  // Clean and format names for username (slug-like)
  const slugify = (text: string | null | undefined) => {
    if (!text) return "";
    const result = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      .replace(/-+/g, "-"); // Replace multiple hyphens with single

    console.log("[USERNAME_GEN] Slugified", { input: text, output: result });
    return result;
  };

  const cleanFirst = slugify(firstName);
  const cleanLast = slugify(lastName);
  const emailPrefix = email ? slugify(email.split("@")[0]) : "";

  console.log("[USERNAME_GEN] Cleaned inputs", {
    cleanFirst,
    cleanLast,
    emailPrefix,
  });

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

  console.log("[USERNAME_GEN] Generated candidates", {
    allCandidates: candidates,
    candidateCount: candidates.length,
  });

  // Filter candidates by length and ensure minimum length (4 characters minimum)
  const validCandidates = candidates
    .filter(
      (username) =>
        username.length >= 4 && username.length <= MAX_USERNAME_LENGTH,
    )
    .slice(0, 10); // Limit to first 10 candidates

  console.log("[USERNAME_GEN] Valid candidates after filtering", {
    validCandidates,
    validCount: validCandidates.length,
    filteredOut: candidates.length - validCandidates.length,
  });

  // Batch check all candidates at once
  if (validCandidates.length > 0) {
    console.log("[USERNAME_GEN] Checking candidate availability...");
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

    console.log("[USERNAME_GEN] Candidate availability check results", {
      takenUsernames: Array.from(takenUsernames),
      availableCandidates: validCandidates.filter(
        (c) => !takenUsernames.has(c),
      ),
    });

    // Return first available candidate
    for (const candidate of validCandidates) {
      if (!takenUsernames.has(candidate)) {
        console.log("[USERNAME_GEN] SUCCESS: Found available username", {
          selectedUsername: candidate,
          strategy: "primary_candidates",
        });
        return candidate;
      }
    }
  }

  // If all candidates are taken, add numbers to the best candidate
  // Ensure the base username is at least 4 characters long
  let baseUsername = validCandidates[0] || "user";

  // If the base username is too short, pad it to meet the 4-character minimum
  if (baseUsername.length < 4) {
    console.log(
      "[USERNAME_GEN] Base username too short, padding to meet 4-character minimum",
      {
        originalBase: baseUsername,
        length: baseUsername.length,
      },
    );
    // Pad with 'x' characters to reach minimum length
    baseUsername = baseUsername.padEnd(4, "x");
    console.log("[USERNAME_GEN] Padded base username", {
      paddedBase: baseUsername,
      newLength: baseUsername.length,
    });
  }

  console.log(
    "[USERNAME_GEN] All primary candidates taken, trying numbered fallbacks",
    {
      baseUsername,
      fallbackStrategy: "numbered_usernames",
    },
  );

  // Ensure base username with numbers fits within limit
  const maxNumberLength = MAX_USERNAME_LENGTH - baseUsername.length - 1; // -1 for the number
  if (maxNumberLength > 0) {
    const maxNumber = Math.pow(10, maxNumberLength) - 1;

    console.log("[USERNAME_GEN] Numbered fallback constraints", {
      maxNumberLength,
      maxNumber,
      baseUsernameLength: baseUsername.length,
    });

    // Batch check numbered usernames (1-99)
    const numberedCandidates: string[] = [];
    for (let i = 1; i < 100 && i <= maxNumber; i++) {
      numberedCandidates.push(`${baseUsername}${i}`);
    }

    if (numberedCandidates.length > 0) {
      console.log("[USERNAME_GEN] Checking numbered candidates", {
        numberedCandidates: numberedCandidates.slice(0, 5), // Show first 5 for brevity
        totalNumberedCandidates: numberedCandidates.length,
      });

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

      console.log("[USERNAME_GEN] Numbered candidates availability", {
        takenNumbered: Array.from(takenNumbered),
        availableNumbered: numberedCandidates
          .filter((c) => !takenNumbered.has(c))
          .slice(0, 5),
      });

      for (const candidate of numberedCandidates) {
        if (!takenNumbered.has(candidate)) {
          console.log(
            "[USERNAME_GEN] SUCCESS: Found available numbered username",
            {
              selectedUsername: candidate,
              strategy: "numbered_fallback",
            },
          );
          return candidate;
        }
      }

      console.log(
        "[USERNAME_GEN] All numbered candidates taken, proceeding to timestamp fallback",
      );
    } else {
      console.log(
        "[USERNAME_GEN] No numbered candidates possible due to length constraints",
      );
    }
  }

  // Ultimate fallback: use timestamp (ensure it fits)
  const timestamp = Date.now().toString();
  const fallbackUsername = `${baseUsername}${timestamp}`;

  console.log("[USERNAME_GEN] Using timestamp fallback", {
    baseUsername,
    timestamp,
    fallbackUsername,
    fallbackLength: fallbackUsername.length,
    maxLength: MAX_USERNAME_LENGTH,
    strategy: "timestamp_fallback",
  });

  if (fallbackUsername.length <= MAX_USERNAME_LENGTH) {
    console.log("[USERNAME_GEN] SUCCESS: Using timestamp fallback username", {
      selectedUsername: fallbackUsername,
      strategy: "timestamp_fallback",
    });
    return fallbackUsername;
  }

  // If even timestamp is too long, truncate the base and add timestamp
  // Ensure we have at least 1 character from the base to maintain some personalization
  // while still ensuring the final username is at least 4 characters long
  const minBaseChars = Math.max(1, 4 - timestamp.length);
  const maxBaseChars = MAX_USERNAME_LENGTH - timestamp.length;

  // Use the maximum possible characters from base while respecting constraints
  const truncatedBase = baseUsername.substring(
    0,
    Math.max(minBaseChars, maxBaseChars),
  );

  const finalUsername = `${truncatedBase}${timestamp}`;

  console.log("[USERNAME_GEN] SUCCESS: Using truncated timestamp fallback", {
    selectedUsername: finalUsername,
    truncatedBase,
    timestamp,
    strategy: "truncated_timestamp_fallback",
  });

  return finalUsername;
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
    retryAttempt: v.optional(v.number()), // Add retry attempt parameter
    maxRetries: v.optional(v.number()), // Add max retries parameter
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const retryAttempt = args.retryAttempt ?? 0;
    const maxRetries = args.maxRetries ?? 0;
    const isLastAttempt = retryAttempt >= maxRetries;

    console.log("[USERNAME_GEN] generateUsername called", {
      guestUserId: args.guestUserId,
      hasFirstName: !!args.firstName,
      hasLastName: !!args.lastName,
      hasEmail: !!args.email,
      retryAttempt,
      maxRetries,
      isLastAttempt,
      timestamp: new Date().toISOString(),
    });

    // Validate guest user ID format
    if (!args.guestUserId?.startsWith("guest_")) {
      console.error("[USERNAME_GEN] ERROR: Invalid guest user ID", {
        guestUserId: args.guestUserId,
        error: "Guest user ID must start with 'guest_'",
      });
      throw new ConvexError(
        "Valid guest user ID required for username generation",
      );
    }

    try {
      let result: string;

      if (isLastAttempt) {
        // On the last attempt, use timestamp-based generation for maximum uniqueness
        console.log(
          "[USERNAME_GEN] Using timestamp-based generation (final attempt)",
          {
            retryAttempt,
            maxRetries,
          },
        );

        const timestamp = Date.now().toString();
        const baseUsername = args.firstName
          ? args.firstName
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .substring(0, 10)
          : "user";

        result = `${baseUsername}${timestamp}`;

        // Ensure it fits within length limits
        if (result.length > MAX_USERNAME_LENGTH) {
          const truncatedBase = baseUsername.substring(
            0,
            MAX_USERNAME_LENGTH - timestamp.length,
          );
          result = `${truncatedBase}${timestamp}`;
        }

        console.log("[USERNAME_GEN] Generated timestamp-based username", {
          baseUsername,
          timestamp,
          result,
          strategy: "timestamp_final_attempt",
        });
      } else {
        // Use normal username generation for non-final attempts
        console.log("[USERNAME_GEN] Using normal username generation", {
          retryAttempt,
          maxRetries,
        });

        result = await generateUniqueUsername(
          ctx.db,
          args.firstName,
          args.lastName,
          args.email,
        );
      }

      console.log("[USERNAME_GEN] generateUsername completed successfully", {
        guestUserId: args.guestUserId,
        generatedUsername: result,
        retryAttempt,
        isLastAttempt,
        duration: "completed",
      });

      return result;
    } catch (error) {
      console.error("[USERNAME_GEN] ERROR: generateUsername failed", {
        guestUserId: args.guestUserId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        retryAttempt,
        isLastAttempt,
      });
      throw error;
    }
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
 * List users for PostHog backfill - paginated query
 */
export const listForBackfill = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { paginationOpts }) => {
    const results = await ctx.db
      .query("users")
      .order("asc")
      .paginate(paginationOpts);
    return {
      ...results,
      page: results.page.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
      })),
    };
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

    const updates: Record<string, string | undefined> = {
      updatedAt: new Date().toISOString(),
    };

    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.publicEmail !== undefined) updates.publicEmail = args.publicEmail;
    if (args.publicPhone !== undefined) updates.publicPhone = args.publicPhone;
    if (args.publicInsta !== undefined) updates.publicInsta = args.publicInsta;
    if (args.publicWebsite !== undefined)
      updates.publicWebsite = args.publicWebsite;
    if (args.displayName !== undefined) updates.displayName = args.displayName;

    await ctx.db.patch(user._id, updates);

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
 * Update user's public list settings
 */
export const updatePublicListSettings = mutation({
  args: {
    userId: v.string(),
    publicListEnabled: v.optional(v.boolean()),
    publicListName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError(
        "User must be logged in to update public list settings",
      );
    }

    // Verify that the authenticated user's ID matches the userId being updated
    if (identity.subject !== args.userId) {
      throw new ConvexError(
        "Unauthorized: You can only update your own public list settings",
      );
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.userId))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Check if user has showDiscover enabled - prevent enabling public list if they do
    const userShowDiscover =
      (user.publicMetadata as { showDiscover?: boolean } | null)
        ?.showDiscover ?? false;

    if (args.publicListEnabled === true && userShowDiscover) {
      throw new ConvexError(
        "Cannot enable public list when showDiscover is enabled. Please contact support if you need both features.",
      );
    }

    const updates: Record<string, boolean | string | undefined> = {
      updatedAt: new Date().toISOString(),
    };

    if (args.publicListEnabled !== undefined) {
      updates.publicListEnabled = args.publicListEnabled;
    }

    if (args.publicListName !== undefined) {
      updates.publicListName = args.publicListName;
    }

    await ctx.db.patch(user._id, updates);

    return null;
  },
});

/**
 * Get user's public list if enabled
 */
export const getPublicList = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (!user?.publicListEnabled) {
      return null;
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        userImage: user.userImage,
        publicListName: user.publicListName,
        publicListEnabled: user.publicListEnabled,
      },
    };
  },
});

/**
 * Get events for a user's public list
 */
export const getPublicListEvents = query({
  args: {
    username: v.string(),
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
    beforeThisDateTime: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { username, paginationOpts, filter = "upcoming", beforeThisDateTime },
  ) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (!user?.publicListEnabled) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    // Build query with proper index - same logic as getUserCreatedEvents
    let eventsQuery = ctx.db
      .query("events")
      .withIndex("by_user_and_startDateTime", (q) => q.eq("userId", user.id));

    // Apply time filter - use current time if not provided
    const referenceDateTime = beforeThisDateTime || new Date().toISOString();
    eventsQuery = eventsQuery.filter((q) =>
      filter === "upcoming"
        ? q.gte(q.field("endDateTime"), referenceDateTime)
        : q.lt(q.field("endDateTime"), referenceDateTime),
    );

    // Apply ordering based on filter
    const orderedQuery =
      filter === "upcoming"
        ? eventsQuery.order("asc")
        : eventsQuery.order("desc");

    // Paginate
    const results = await orderedQuery.paginate(paginationOpts);

    // Enrich events with user data
    const enrichedEvents = results.page.map((event) => ({
      ...event,
      user: user,
    }));

    return {
      ...results,
      page: enrichedEvents,
    };
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
