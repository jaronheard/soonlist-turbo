import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import * as Events from "./model/events";
import { eventDataValidator } from "./events";
import { ConvexError } from "convex/values";

const eventMetadataValidator = v.optional(
  v.object({
    accessibility: v.optional(v.array(v.string())),
    accessibilityNotes: v.optional(v.string()),
    ageRestriction: v.optional(v.string()),
    category: v.optional(v.string()),
    mentions: v.optional(v.array(v.string())),
    performers: v.optional(v.array(v.string())),
    priceMax: v.optional(v.number()),
    priceMin: v.optional(v.number()),
    priceType: v.optional(v.string()),
    source: v.optional(v.string()),
    type: v.optional(v.string()),
  }),
);

/**
 * Create an event as a guest user
 */
export const createGuestEvent = mutation({
  args: {
    guestUserId: v.string(),
    event: eventDataValidator,
    eventMetadata: eventMetadataValidator,
    comment: v.optional(v.string()),
    lists: v.array(v.object({ value: v.string() })),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  },
  handler: async (ctx, args) => {
    const { guestUserId, event, eventMetadata, comment, lists, visibility } = args;

    // Create event with guest token
    const eventId = await Events.createEvent(
      ctx,
      undefined, // No authenticated userId
      "Guest User", // Default username for guests
      event,
      eventMetadata,
      comment,
      lists,
      visibility || "private", // Default to private for guest events
      guestUserId, // Pass guest ID as owner token
      true // Mark as guest event
    );

    return eventId;
  },
});

/**
 * Transfer guest events to authenticated user
 */
export const transferGuestEvents = mutation({
  args: {
    guestUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User must be logged in to transfer events",
        data: { args },
      });
    }

    // Get user info
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

    // Find all guest events
    const guestEvents = await ctx.db
      .query("events")
      .withIndex("by_owner", (q) => q.eq("ownerToken", args.guestUserId))
      .filter((q) => q.eq(q.field("isGuest"), true))
      .collect();

    // Transfer ownership of each event
    for (const event of guestEvents) {
      await ctx.db.patch(event._id, {
        userId: user.id,
        userName: user.username,
        ownerToken: user.id,
        isGuest: false,
      });
    }

    return guestEvents.length;
  },
});

/**
 * Get guest events
 */
export const getGuestEvents = query({
  args: {
    guestUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_owner", (q) => q.eq("ownerToken", args.guestUserId))
      .filter((q) => q.eq(q.field("isGuest"), true))
      .collect();

    return events;
  },
});