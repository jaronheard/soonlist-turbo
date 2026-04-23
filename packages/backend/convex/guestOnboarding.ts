import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, mutation } from "./_generated/server";
import { onboardingDataValidator } from "./schema";

export const saveGuestOnboardingData = mutation({
  args: {
    guestUserId: v.string(),
    data: onboardingDataValidator,
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { guestUserId, data } = args;

    const existing = await ctx.db
      .query("guestOnboardingData")
      .withIndex("by_owner", (q) => q.eq("ownerToken", guestUserId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        data: { ...existing.data, ...data },
        updatedAt: new Date().toISOString(),
      });
    } else {
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

    const guestData = await ctx.db
      .query("guestOnboardingData")
      .withIndex("by_owner", (q) => q.eq("ownerToken", args.guestUserId))
      .first();

    if (!guestData) {
      return { transferred: false };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", identity.subject))
      .unique();

    if (!user) {
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
        },
      );

      return { transferred: false };
    }

    await ctx.db.patch(user._id, {
      onboardingData: guestData.data,
      onboardingCompletedAt: guestData.data.completedAt || null,
    });

    await ctx.db.delete(guestData._id);

    return { transferred: true };
  },
});

export const retryTransfer = internalMutation({
  args: {
    userId: v.string(),
    guestUserId: v.string(),
    attemptCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const maxAttempts = 3;

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

      const delayMs = Math.min(5000 * Math.pow(2, args.attemptCount), 30000);
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
        },
      );
      return;
    }

    console.log("Retrying guest data transfer - user now exists", {
      userId: args.userId,
      guestUserId: args.guestUserId,
      attemptCount: args.attemptCount,
    });

    await ctx.db.patch(user._id, {
      onboardingData: guestData.data,
      onboardingCompletedAt: guestData.data.completedAt || null,
    });

    await ctx.db.delete(guestData._id);

    console.log("Guest data successfully transferred on retry", {
      userId: args.userId,
      guestUserId: args.guestUserId,
      attemptCount: args.attemptCount,
    });
  },
});
