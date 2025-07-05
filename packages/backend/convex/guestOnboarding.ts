import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, mutation } from "./_generated/server";
import { onboardingDataValidator } from "./schema";

/**
 * Save onboarding data for a guest user
 */
export const saveGuestOnboardingData = mutation({
  args: {
    guestUserId: v.string(),
    data: onboardingDataValidator,
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { guestUserId, data } = args;

    // Check if we already have onboarding data for this guest
    const existing = await ctx.db
      .query("guestOnboardingData")
      .withIndex("by_owner", (q) => q.eq("ownerToken", guestUserId))
      .first();

    if (existing) {
      // Update existing data
      await ctx.db.patch(existing._id, {
        data: { ...existing.data, ...data },
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Create new onboarding data
      await ctx.db.insert("guestOnboardingData", {
        ownerToken: guestUserId,
        isGuest: true,
        data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true };
  },
});

/**
 * Transfer guest onboarding data to authenticated user
 */
export const transferGuestOnboardingData = mutation({
  args: {
    guestUserId: v.string(),
  },
  returns: v.object({ transferred: v.boolean() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User must be logged in to transfer onboarding data",
        data: { args },
      });
    }

    // Find guest onboarding data
    const guestData = await ctx.db
      .query("guestOnboardingData")
      .withIndex("by_owner", (q) => q.eq("ownerToken", args.guestUserId))
      .first();

    if (!guestData) {
      return { transferred: false };
    }

    // Get the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", identity.subject))
      .unique();

    if (!user) {
      // User hasn't been created by Clerk webhook yet
      // This can happen due to race conditions during signup
      // Schedule a retry for 5 seconds later
      console.log("User not found yet, scheduling retry", {
        userId: identity.subject,
        guestUserId: args.guestUserId,
      });
      
      await ctx.scheduler.runAfter(
        5000, // 5 seconds
        internal.guestOnboarding.retryTransfer,
        {
          userId: identity.subject,
          guestUserId: args.guestUserId,
          attemptCount: 1,
        }
      );
      
      return { transferred: false };
    }

    // Update user with onboarding data
    await ctx.db.patch(user._id, {
      onboardingData: guestData.data,
      onboardingCompletedAt: guestData.data.completedAt || null,
    });

    // Delete guest data
    await ctx.db.delete(guestData._id);

    return { transferred: true };
  },
});

/**
 * Internal mutation to retry guest data transfer
 * This is called by the scheduler when initial transfer fails due to race conditions
 */
export const retryTransfer = internalMutation({
  args: {
    userId: v.string(),
    guestUserId: v.string(),
    attemptCount: v.number(),
  },
  handler: async (ctx, args) => {
    const maxAttempts = 3;
    
    // Find guest onboarding data
    const guestData = await ctx.db
      .query("guestOnboardingData")
      .withIndex("by_owner", (q) => q.eq("ownerToken", args.guestUserId))
      .first();

    if (!guestData) {
      console.log("Guest data no longer exists, skipping retry", {
        guestUserId: args.guestUserId,
      });
      return;
    }

    // Get the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.userId))
      .unique();

    if (!user) {
      if (args.attemptCount >= maxAttempts) {
        console.error("Failed to transfer guest data after max attempts", {
          userId: args.userId,
          guestUserId: args.guestUserId,
          attemptCount: args.attemptCount,
        });
        return;
      }

      // Schedule another retry with exponential backoff
      const delayMs = Math.min(5000 * Math.pow(2, args.attemptCount), 30000); // Max 30 seconds
      console.log("User still not found, scheduling another retry", {
        userId: args.userId,
        guestUserId: args.guestUserId,
        attemptCount: args.attemptCount + 1,
        delayMs,
      });
      
      await ctx.scheduler.runAfter(
        delayMs,
        internal.guestOnboarding.retryTransfer,
        {
          userId: args.userId,
          guestUserId: args.guestUserId,
          attemptCount: args.attemptCount + 1,
        }
      );
      return;
    }

    // User exists! Transfer the data
    console.log("Retrying guest data transfer - user now exists", {
      userId: args.userId,
      guestUserId: args.guestUserId,
      attemptCount: args.attemptCount,
    });

    // Update user with onboarding data
    await ctx.db.patch(user._id, {
      onboardingData: guestData.data,
      onboardingCompletedAt: guestData.data.completedAt || null,
    });

    // Delete guest data
    await ctx.db.delete(guestData._id);

    console.log("Guest data successfully transferred on retry", {
      userId: args.userId,
      guestUserId: args.guestUserId,
      attemptCount: args.attemptCount,
    });
  },
});
