import { v } from "convex/values";

import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
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
      await userFeedsAggregate.replaceOrInsert(ctx, insertedDoc, insertedDoc);
    } else {
      const oldDoc = existingCreatorEntry;
      const newHasEnded = eventEndTime < currentTime;
      await ctx.db.patch(existingCreatorEntry._id, {
        eventStartTime,
        eventEndTime,
        hasEnded: newHasEnded,
      });
      const updatedDoc = (await ctx.db.get(existingCreatorEntry._id))!;
      await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);
    }

    // 2. Add to feeds of users who follow this event
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
        await userFeedsAggregate.replaceOrInsert(ctx, insertedDoc, insertedDoc);
      } else {
        const oldDoc = existingFollowerEntry;
        const newHasEnded = eventEndTime < currentTime;
        await ctx.db.patch(existingFollowerEntry._id, {
          eventStartTime,
          eventEndTime,
          hasEnded: newHasEnded,
        });
        const updatedDoc = (await ctx.db.get(existingFollowerEntry._id))!;
        await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);
      }
    }

    // 3. Update feeds for users following lists that contain this event
    if (visibility === "public") {
      const eventToLists = await ctx.db
        .query("eventToLists")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .collect();

      for (const etl of eventToLists) {
        await ctx.runMutation(
          internal.feedHelpers.addEventToListFollowersFeeds,
          {
            eventId,
            listId: etl.listId,
          },
        );
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
      await userFeedsAggregate.replaceOrInsert(ctx, insertedDoc, insertedDoc);
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
      await userFeedsAggregate.deleteIfExists(ctx, entry);
      await ctx.db.delete(entry._id);
    }
  },
});

async function canUserViewListForFeed(
  ctx: MutationCtx,
  listId: string,
  userId: string,
): Promise<boolean> {
  const list = await ctx.db
    .query("lists")
    .withIndex("by_custom_id", (q) => q.eq("id", listId))
    .first();

  if (!list) {
    return false;
  }

  if (list.visibility === "public" || list.visibility === "unlisted") {
    return true;
  }

  if (list.userId === userId) {
    return true;
  }

  const membership = await ctx.db
    .query("listMembers")
    .withIndex("by_list_and_user", (q) =>
      q.eq("listId", listId).eq("userId", userId),
    )
    .first();
  return !!membership;
}

// Helper to add all events from a list to a user's followedLists feed
export const addListEventsToUserFeed = internalMutation({
  args: {
    userId: v.string(),
    listId: v.string(),
  },
  handler: async (ctx, { userId, listId }) => {
    const canView = await canUserViewListForFeed(ctx, listId, userId);
    if (!canView) {
      return;
    }

    const eventToLists = await ctx.db
      .query("eventToLists")
      .withIndex("by_list", (q) => q.eq("listId", listId))
      .collect();

    const currentTime = Date.now();
    const followedListsFeedId = `followedLists_${userId}`;

    for (const etl of eventToLists) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", etl.eventId))
        .first();

      if (!event) {
        continue;
      }

      if (event.visibility !== "public") {
        continue;
      }

      const eventStartTime = new Date(event.startDateTime).getTime();
      const eventEndTime = new Date(event.endDateTime).getTime();

      const existingFollowedListsEntry = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", followedListsFeedId).eq("eventId", etl.eventId),
        )
        .first();

      if (!existingFollowedListsEntry) {
        const doc = {
          feedId: followedListsFeedId,
          eventId: etl.eventId,
          eventStartTime,
          eventEndTime,
          addedAt: currentTime,
          hasEnded: eventEndTime < currentTime,
        };
        const id = await ctx.db.insert("userFeeds", doc);
        const insertedDoc = (await ctx.db.get(id))!;
        await userFeedsAggregate.replaceOrInsert(ctx, insertedDoc, insertedDoc);
      }

      const personalFeedId = `user_${userId}`;
      const existingPersonalEntry = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", personalFeedId).eq("eventId", etl.eventId),
        )
        .first();

      if (!existingPersonalEntry) {
        const doc = {
          feedId: personalFeedId,
          eventId: etl.eventId,
          eventStartTime,
          eventEndTime,
          addedAt: currentTime,
          hasEnded: eventEndTime < currentTime,
        };
        const id = await ctx.db.insert("userFeeds", doc);
        const insertedDoc = (await ctx.db.get(id))!;
        await userFeedsAggregate.replaceOrInsert(ctx, insertedDoc, insertedDoc);
      }
    }
  },
});

// Helper to remove all events from a list from a user's followedLists feed
export const removeListEventsFromUserFeed = internalMutation({
  args: {
    userId: v.string(),
    listId: v.string(),
  },
  handler: async (ctx, { userId, listId }) => {
    const eventToLists = await ctx.db
      .query("eventToLists")
      .withIndex("by_list", (q) => q.eq("listId", listId))
      .collect();

    const followedListsFeedId = `followedLists_${userId}`;

    for (const etl of eventToLists) {
      const existingEntry = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", followedListsFeedId).eq("eventId", etl.eventId),
        )
        .first();

      if (existingEntry) {
        await userFeedsAggregate.deleteIfExists(ctx, existingEntry);
        await ctx.db.delete(existingEntry._id);
      }
    }
  },
});

// Helper to add an event to all followers' followedLists feeds when added to a list
export const addEventToListFollowersFeeds = internalMutation({
  args: {
    eventId: v.string(),
    listId: v.string(),
  },
  handler: async (ctx, { eventId, listId }) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", eventId))
      .first();

    if (!event) {
      return;
    }

    if (event.visibility !== "public") {
      return;
    }

    const listFollows = await ctx.db
      .query("listFollows")
      .withIndex("by_list", (q) => q.eq("listId", listId))
      .collect();

    const eventStartTime = new Date(event.startDateTime).getTime();
    const eventEndTime = new Date(event.endDateTime).getTime();
    const currentTime = Date.now();

    for (const follow of listFollows) {
      const canView = await canUserViewListForFeed(ctx, listId, follow.userId);
      if (!canView) {
        continue;
      }

      const followedListsFeedId = `followedLists_${follow.userId}`;

      const existingEntry = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", followedListsFeedId).eq("eventId", eventId),
        )
        .first();

      if (!existingEntry) {
        const doc = {
          feedId: followedListsFeedId,
          eventId,
          eventStartTime,
          eventEndTime,
          addedAt: currentTime,
          hasEnded: eventEndTime < currentTime,
        };
        const id = await ctx.db.insert("userFeeds", doc);
        const insertedDoc = (await ctx.db.get(id))!;
        await userFeedsAggregate.replaceOrInsert(ctx, insertedDoc, insertedDoc);
      }
    }
  },
});

// Helper to remove an event from all followers' followedLists feeds when removed from a list
export const removeEventFromListFollowersFeeds = internalMutation({
  args: {
    eventId: v.string(),
    listId: v.string(),
  },
  handler: async (ctx, { eventId, listId }) => {
    const listFollows = await ctx.db
      .query("listFollows")
      .withIndex("by_list", (q) => q.eq("listId", listId))
      .collect();

    for (const follow of listFollows) {
      const followedListsFeedId = `followedLists_${follow.userId}`;

      const existingEntry = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", followedListsFeedId).eq("eventId", eventId),
        )
        .first();

      if (existingEntry) {
        await userFeedsAggregate.deleteIfExists(ctx, existingEntry);
        await ctx.db.delete(existingEntry._id);
      }
    }
  },
});
