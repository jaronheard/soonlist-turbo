import { ConvexError, v } from "convex/values";

import { mutation } from "./_generated/server";
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
      throw new ConvexError({
        message: "User not found",
        data: { userId: identity.subject },
      });
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
