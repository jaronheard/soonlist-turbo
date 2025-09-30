import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { userFeedsAggregate } from "./aggregates";

// Helper to add an event to feeds when it's created or updated
export const updateEventInFeeds = internalMutation({
  args: {
    eventId: v.string(),
    userId: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    startDateTime: v.string(),
    endDateTime: v.string(),
  },
  handler: async (
    ctx,
    { eventId, userId, visibility, startDateTime, endDateTime },
  ) => {
    if (isNaN(new Date(startDateTime).getTime())) {
      throw new Error(`Invalid startDateTime: ${startDateTime}`);
    }
    if (isNaN(new Date(endDateTime).getTime())) {
      throw new Error(`Invalid endDateTime: ${endDateTime}`);
    }
    const eventStartTime = new Date(startDateTime).getTime();
    const eventEndTime = new Date(endDateTime).getTime();
    const currentTime = Date.now();

    // 1. Always add to creator's personal feed
    const creatorFeedId = `user_${userId}`;
    const existingCreatorEntry = await ctx.db
      .query("userFeeds")
      .withIndex("by_feed_event", (q) =>
        q.eq("feedId", creatorFeedId).eq("eventId", eventId),
      )
      .first();

    if (!existingCreatorEntry) {
      const doc = {
        feedId: creatorFeedId,
        eventId,
        eventStartTime,
        eventEndTime,
        addedAt: currentTime,
        hasEnded: eventEndTime < currentTime, // always set
      };
      const id = await ctx.db.insert("userFeeds", doc);
      const insertedDoc = (await ctx.db.get(id))!;
      await userFeedsAggregate.insert(ctx, insertedDoc);
    } else {
      const oldDoc = existingCreatorEntry;
      const newHasEnded = eventEndTime < currentTime;
      await ctx.db.patch(existingCreatorEntry._id, {
        eventStartTime,
        eventEndTime,
        hasEnded: newHasEnded,
      });
      const updatedDoc = (await ctx.db.get(existingCreatorEntry._id))!;
      await userFeedsAggregate.replace(ctx, oldDoc, updatedDoc);
    }

    // 2. Add to discover feed if public
    if (visibility === "public") {
      const discoverFeedId = "discover";
      const existingDiscoverEntry = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", discoverFeedId).eq("eventId", eventId),
        )
        .first();

      if (!existingDiscoverEntry) {
        const doc = {
          feedId: discoverFeedId,
          eventId,
          eventStartTime,
          eventEndTime,
          addedAt: currentTime,
          hasEnded: eventEndTime < currentTime, // always set
        };
        const id = await ctx.db.insert("userFeeds", doc);
        const insertedDoc = (await ctx.db.get(id))!;
        await userFeedsAggregate.insert(ctx, insertedDoc);
      } else {
        const oldDoc = existingDiscoverEntry;
        const newHasEnded = eventEndTime < currentTime;
        await ctx.db.patch(existingDiscoverEntry._id, {
          eventStartTime,
          eventEndTime,
          hasEnded: newHasEnded,
        });
        const updatedDoc = (await ctx.db.get(existingDiscoverEntry._id))!;
        await userFeedsAggregate.replace(ctx, oldDoc, updatedDoc);
      }
    }

    // 3. Add to feeds of users who follow this event
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    for (const follow of eventFollows) {
      const followerFeedId = `user_${follow.userId}`;
      const existingFollowerEntry = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", followerFeedId).eq("eventId", eventId),
        )
        .first();

      if (!existingFollowerEntry) {
        const doc = {
          feedId: followerFeedId,
          eventId,
          eventStartTime,
          eventEndTime,
          addedAt: currentTime,
          hasEnded: eventEndTime < currentTime, // always set
        };
        const id = await ctx.db.insert("userFeeds", doc);
        const insertedDoc = (await ctx.db.get(id))!;
        await userFeedsAggregate.insert(ctx, insertedDoc);
      } else {
        const oldDoc = existingFollowerEntry;
        const newHasEnded = eventEndTime < currentTime;
        await ctx.db.patch(existingFollowerEntry._id, {
          eventStartTime,
          eventEndTime,
          hasEnded: newHasEnded,
        });
        const updatedDoc = (await ctx.db.get(existingFollowerEntry._id))!;
        await userFeedsAggregate.replace(ctx, oldDoc, updatedDoc);
      }
    }
  },
});

// Helper to add event to a user's feed when they follow it
export const addEventToUserFeed = internalMutation({
  args: {
    userId: v.string(),
    eventId: v.string(),
  },
  handler: async (ctx, { userId, eventId }) => {
    // Get the event to get its start time
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", eventId))
      .first();

    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    const feedId = `user_${userId}`;
    const eventStartTime = new Date(event.startDateTime).getTime();
    const eventEndTime = new Date(event.endDateTime).getTime();
    const currentTime = Date.now();

    // Check if already in feed
    const existing = await ctx.db
      .query("userFeeds")
      .withIndex("by_feed_event", (q) =>
        q.eq("feedId", feedId).eq("eventId", eventId),
      )
      .first();

    if (!existing) {
      const doc = {
        feedId,
        eventId,
        eventStartTime,
        eventEndTime,
        addedAt: currentTime,
        hasEnded: eventEndTime < currentTime, // always set
      };
      const id = await ctx.db.insert("userFeeds", doc);
      const insertedDoc = (await ctx.db.get(id))!;
      await userFeedsAggregate.insert(ctx, insertedDoc);
    }
  },
});

// Helper to remove event from feeds (e.g., when visibility changes to private)
export const removeEventFromFeeds = internalMutation({
  args: {
    eventId: v.string(),
    keepCreatorFeed: v.optional(v.boolean()),
  },
  handler: async (ctx, { eventId, keepCreatorFeed = true }) => {
    // Get all feed entries for this event
    const feedEntries = await ctx.db
      .query("userFeeds")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    // Fetch the event once if we need to check creator
    let event = null;
    if (keepCreatorFeed) {
      event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", eventId))
        .first();
    }

    for (const entry of feedEntries) {
      // If keepCreatorFeed is true, skip only the creator's feed
      if (keepCreatorFeed && event && entry.feedId === `user_${event.userId}`) {
        continue;
      }

      // Delete all other entries (including discover and other user feeds)
      await userFeedsAggregate.delete(ctx, entry);
      await ctx.db.delete(entry._id);
    }
  },
});
