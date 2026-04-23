import { ConvexError, v } from "convex/values";

import type { DatabaseReader } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { getOrCreatePersonalList } from "./lists";
import { onboardingDataValidator, userAdditionalInfoValidator } from "./schema";

const MAX_USERNAME_LENGTH = 64;

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

  const slugify = (text: string | null | undefined) => {
    if (!text) return "";
    const result = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");

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

  const candidates: string[] = [];

  if (cleanFirst) {
    candidates.push(cleanFirst);
  }

  if (cleanFirst && cleanLast) {
    candidates.push(`${cleanFirst}${cleanLast}`);
    candidates.push(`${cleanFirst}-${cleanLast}`);
    candidates.push(`${cleanFirst}_${cleanLast}`);
  }

  if (cleanLast) {
    candidates.push(cleanLast);
  }

  if (emailPrefix && emailPrefix !== cleanFirst && emailPrefix !== cleanLast) {
    candidates.push(emailPrefix);
  }

  if (cleanFirst && cleanLast) {
    candidates.push(`${cleanFirst[0]}${cleanLast}`);
    candidates.push(`${cleanFirst[0]}-${cleanLast}`);
  }

  console.log("[USERNAME_GEN] Generated candidates", {
    allCandidates: candidates,
    candidateCount: candidates.length,
  });

  const validCandidates = candidates
    .filter(
      (username) =>
        username.length >= 4 && username.length <= MAX_USERNAME_LENGTH,
    )
    .slice(0, 10);

  console.log("[USERNAME_GEN] Valid candidates after filtering", {
    validCandidates,
    validCount: validCandidates.length,
    filteredOut: candidates.length - validCandidates.length,
  });

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

  let baseUsername = validCandidates[0] || "user";

  if (baseUsername.length < 4) {
    console.log(
      "[USERNAME_GEN] Base username too short, padding to meet 4-character minimum",
      {
        originalBase: baseUsername,
        length: baseUsername.length,
      },
    );
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

  const maxNumberLength = MAX_USERNAME_LENGTH - baseUsername.length - 1;
  if (maxNumberLength > 0) {
    const maxNumber = Math.pow(10, maxNumberLength) - 1;

    console.log("[USERNAME_GEN] Numbered fallback constraints", {
      maxNumberLength,
      maxNumber,
      baseUsernameLength: baseUsername.length,
    });

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

  const minBaseChars = Math.max(1, 4 - timestamp.length);
  const maxBaseChars = MAX_USERNAME_LENGTH - timestamp.length;

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

    const existingData = user.onboardingData || {};

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

export const deleteAccount = mutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError("User not authenticated");
    }

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
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError(
        `Failed to delete user from Clerk: ${String(error)}`,
      );
    }

    await ctx.runMutation(internal.users.deleteUserAndCascade, {
      userId: args.userId,
    });

    return null;
  },
});

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

export const syncFromClerk = internalMutation({
  args: {
    id: v.string(),
    username: v.string(),
    email: v.string(),
    displayName: v.string(),
    userImage: v.string(),
    publicMetadata: v.optional(
      v.object({
        showDiscover: v.optional(v.boolean()),
        stripe: v.optional(
          v.object({
            customerId: v.optional(v.string()),
          }),
        ),
        plan: v.optional(
          v.object({
            name: v.optional(v.string()),
            status: v.optional(v.string()),
            trialStartDate: v.optional(v.string()),
          }),
        ),
      }),
    ),
    firstName: v.optional(v.union(v.string(), v.null())),
    lastName: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.id))
      .unique();

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

      await getOrCreatePersonalList(ctx, args.id);
    }
  },
});

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
    await ctx.runMutation(internal.users.deleteUserAndCascade, {
      userId: args.id,
    });
  },
});

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

    if (
      args.publicListEnabled !== undefined &&
      args.publicListEnabled !== user.publicListEnabled
    ) {
      const newVisibility = args.publicListEnabled ? "public" : "private";
      await ctx.scheduler.runAfter(
        0,
        internal.users.bulkUpdateEventVisibilityAction,
        {
          userId: args.userId,
          visibility: newVisibility,
        },
      );
    }

    return null;
  },
});

export const completeFirstShareSetup = mutation({
  args: {
    userId: v.string(),
    publicListName: v.optional(v.string()),
    displayName: v.optional(v.string()),
    publicInsta: v.optional(v.union(v.string(), v.null())),
    publicWebsite: v.optional(v.union(v.string(), v.null())),
    publicEmail: v.optional(v.union(v.string(), v.null())),
    publicPhone: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("User must be logged in to complete setup");
    }
    if (identity.subject !== args.userId) {
      throw new ConvexError(
        "Unauthorized: You can only complete setup for your own account",
      );
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.userId))
      .unique();
    if (!user) {
      throw new ConvexError("User not found");
    }

    const wasPublicBefore = user.publicListEnabled === true;

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      hasSharedListBefore: true,
      publicListEnabled: true,
    };

    if (args.publicListName !== undefined) {
      updates.publicListName = args.publicListName;
    }
    if (args.displayName !== undefined) {
      updates.displayName = args.displayName;
    }
    if (args.publicInsta !== undefined) updates.publicInsta = args.publicInsta;
    if (args.publicWebsite !== undefined) {
      updates.publicWebsite = args.publicWebsite;
    }
    if (args.publicEmail !== undefined) updates.publicEmail = args.publicEmail;
    if (args.publicPhone !== undefined) updates.publicPhone = args.publicPhone;

    await ctx.db.patch(user._id, updates);

    if (!wasPublicBefore) {
      await ctx.scheduler.runAfter(
        0,
        internal.users.bulkUpdateEventVisibilityAction,
        {
          userId: args.userId,
          visibility: "public",
        },
      );
    }

    return null;
  },
});

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

    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const event of events) {
      const eventComments = await ctx.db
        .query("comments")
        .withIndex("by_event", (q) => q.eq("eventId", event.id))
        .collect();
      for (const comment of eventComments) {
        await ctx.db.delete(comment._id);
      }

      const eventFollowsOfEvent = await ctx.db
        .query("eventFollows")
        .withIndex("by_event", (q) => q.eq("eventId", event.id))
        .collect();
      for (const follow of eventFollowsOfEvent) {
        await ctx.db.delete(follow._id);
      }

      const eventToListsOfEvent = await ctx.db
        .query("eventToLists")
        .withIndex("by_event", (q) => q.eq("eventId", event.id))
        .collect();
      for (const etl of eventToListsOfEvent) {
        await ctx.db.delete(etl._id);
      }

      await ctx.scheduler.runAfter(
        0,
        internal.feedHelpers.removeEventFromFeeds,
        {
          eventId: event.id,
          keepCreatorFeed: false,
          keepListFeeds: false,
        },
      );

      await ctx.db.delete(event._id);
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    const lists = await ctx.db
      .query("lists")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const list of lists) {
      const listFollowsOfList = await ctx.db
        .query("listFollows")
        .withIndex("by_list", (q) => q.eq("listId", list.id))
        .collect();
      for (const follow of listFollowsOfList) {
        await ctx.db.delete(follow._id);
      }

      const eventToListsOfList = await ctx.db
        .query("eventToLists")
        .withIndex("by_list", (q) => q.eq("listId", list.id))
        .collect();
      for (const etl of eventToListsOfList) {
        await ctx.db.delete(etl._id);
      }

      await ctx.scheduler.runAfter(
        0,
        internal.feedHelpers.removeListFeedAction,
        { listId: list.id },
      );

      await ctx.db.delete(list._id);
    }

    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const follow of eventFollows) {
      await ctx.db.delete(follow._id);
    }

    const listFollows = await ctx.db
      .query("listFollows")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const follow of listFollows) {
      await ctx.db.delete(follow._id);
    }

    const pushTokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const token of pushTokens) {
      await ctx.db.delete(token._id);
    }

    const eventBatches = await ctx.db
      .query("eventBatches")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const batch of eventBatches) {
      await ctx.db.delete(batch._id);
    }

    const userFeeds = await ctx.db
      .query("userFeeds")
      .filter((q) => q.eq(q.field("feedId"), `user_${args.userId}`))
      .collect();
    for (const feed of userFeeds) {
      await ctx.db.delete(feed._id);
    }

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

    await ctx.db.delete(user._id);
  },
});

export const followUser = mutation({
  args: {
    followingId: v.string(),
  },
  returns: v.object({ success: v.boolean(), alreadyFollowing: v.boolean() }),
  handler: async (ctx, { followingId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    const followerId = identity.subject;

    if (followerId === followingId) {
      throw new ConvexError("Cannot follow yourself");
    }

    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", followingId))
      .unique();

    if (!targetUser) {
      throw new ConvexError("User not found");
    }

    const existingFollow = await ctx.db
      .query("userFollows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", followerId).eq("followingId", followingId),
      )
      .first();

    if (existingFollow) {
      return { success: true, alreadyFollowing: true };
    }

    await ctx.db.insert("userFollows", {
      followerId,
      followingId,
    });

    await ctx.runMutation(internal.feedHelpers.addUserEventsToUserFeed, {
      userId: followerId,
      followedUserId: followingId,
    });

    return { success: true, alreadyFollowing: false };
  },
});

export const unfollowUser = mutation({
  args: {
    followingId: v.string(),
  },
  returns: v.object({ success: v.boolean(), wasFollowing: v.boolean() }),
  handler: async (ctx, { followingId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    const followerId = identity.subject;

    const existingFollow = await ctx.db
      .query("userFollows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", followerId).eq("followingId", followingId),
      )
      .first();

    if (!existingFollow) {
      return { success: true, wasFollowing: false };
    }

    await ctx.db.delete(existingFollow._id);

    await ctx.runMutation(internal.feedHelpers.removeUserEventsFromUserFeed, {
      userId: followerId,
      unfollowedUserId: followingId,
    });

    return { success: true, wasFollowing: true };
  },
});

export const isFollowingUser = query({
  args: {
    followingId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, { followingId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const followerId = identity.subject;

    const existingFollow = await ctx.db
      .query("userFollows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", followerId).eq("followingId", followingId),
      )
      .first();

    return !!existingFollow;
  },
});

export const getFollowingUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;

    const follows = await ctx.db
      .query("userFollows")
      .withIndex("by_follower", (q) => q.eq("followerId", userId))
      .collect();

    const users = await Promise.all(
      follows.map(async (follow) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_custom_id", (q) => q.eq("id", follow.followingId))
          .first();
        return user;
      }),
    );

    return users.filter(
      (user): user is NonNullable<typeof user> => user !== null,
    );
  },
});

export const getFollowerCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const follows = await ctx.db
      .query("userFollows")
      .withIndex("by_following", (q) => q.eq("followingId", userId))
      .collect();

    return follows.length;
  },
});

export const bulkUpdateEventVisibilityBatch = internalMutation({
  args: {
    userId: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    updated: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { userId, visibility, cursor, batchSize }) => {
    const result = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .paginate({ numItems: batchSize, cursor });

    let updated = 0;

    for (const event of result.page) {
      if (event.visibility === visibility) continue;

      await ctx.db.patch(event._id, {
        visibility,
        updatedAt: new Date().toISOString(),
      });

      await ctx.scheduler.runAfter(
        0,
        internal.feedHelpers.updateEventVisibilityInFeeds,
        { eventId: event.id, visibility },
      );

      if (visibility === "private") {
        await ctx.scheduler.runAfter(
          0,
          internal.feedHelpers.removeEventFromFeeds,
          { eventId: event.id, keepCreatorFeed: true },
        );
      } else {
        await ctx.scheduler.runAfter(
          0,
          internal.feedHelpers.updateEventInFeeds,
          {
            eventId: event.id,
            userId: event.userId,
            visibility,
            startDateTime: event.startDateTime,
            endDateTime: event.endDateTime,
            similarityGroupId: event.similarityGroupId,
          },
        );
      }

      updated++;
    }

    return {
      processed: result.page.length,
      updated,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const bulkUpdateEventVisibilityAction = internalAction({
  args: {
    userId: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  returns: v.null(),
  handler: async (ctx, { userId, visibility }) => {
    let totalProcessed = 0;
    let totalUpdated = 0;
    let cursor: string | null = null;
    const batchSize = 50;

    while (true) {
      const result: {
        processed: number;
        updated: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(internal.users.bulkUpdateEventVisibilityBatch, {
        userId,
        visibility,
        cursor,
        batchSize,
      });

      totalProcessed += result.processed;
      totalUpdated += result.updated;

      if (result.isDone) {
        break;
      }
      if (result.nextCursor === cursor) {
        console.error(
          `bulkUpdateEventVisibilityAction: cursor stalled at ${cursor} for user ${userId} — aborting`,
        );
        break;
      }
      cursor = result.nextCursor;
    }

    console.log(
      `Bulk updated visibility to ${visibility} for user ${userId}: ${totalUpdated} events updated (${totalProcessed} processed)`,
    );

    return null;
  },
});
