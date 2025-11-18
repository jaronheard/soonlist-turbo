import { v } from "convex/values";

import type { MutationCtx } from "./_generated/server";
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

    // Get user to check showDiscover setting
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", userId))
      .first();

    const userShowDiscover =
      (user?.publicMetadata as { showDiscover?: boolean } | null)
        ?.showDiscover ?? false;

    // 1. Always add to creator's personal feed
    const creatorFeedId = `user_${userId}`;
    await upsertFeedEntry(
      ctx,
      creatorFeedId,
      eventId,
      eventStartTime,
      eventEndTime,
      currentTime,
    );

    // 2. Add to discover feed if public AND user has showDiscover enabled
    if (visibility === "public" && userShowDiscover) {
      const discoverFeedId = "discover";
      await upsertFeedEntry(
        ctx,
        discoverFeedId,
        eventId,
        eventStartTime,
        eventEndTime,
        currentTime,
      );
    } else if (visibility === "private" || !userShowDiscover) {
      // Remove from discover feed if event is now private or user no longer has showDiscover
      const discoverFeedId = "discover";
      const existingDiscoverEntry = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", discoverFeedId).eq("eventId", eventId),
        )
        .first();

      if (existingDiscoverEntry) {
        await userFeedsAggregate.deleteIfExists(ctx, existingDiscoverEntry);
        await ctx.db.delete(existingDiscoverEntry._id);
      }
    }

    // 3. Add to feeds of users who follow this event
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    for (const follow of eventFollows) {
      const followerFeedId = `user_${follow.userId}`;
      await upsertFeedEntry(
        ctx,
        followerFeedId,
        eventId,
        eventStartTime,
        eventEndTime,
        currentTime,
      );
    }

    // Note: List-based feed fanout is handled at precise call sites:
    // - createEvent: after inserting into eventToLists
    // - addEventToList: when adding event to a list
    // - toggleEventVisibility/updateEvent: when visibility changes to public
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

// Helper to update event times across all feed entries for an event
export const updateEventTimesInAllFeeds = internalMutation({
  args: {
    eventId: v.string(),
    startDateTime: v.string(),
    endDateTime: v.string(),
  },
  handler: async (ctx, { eventId, startDateTime, endDateTime }) => {
    if (isNaN(new Date(startDateTime).getTime())) {
      throw new Error(`Invalid startDateTime: ${startDateTime}`);
    }
    if (isNaN(new Date(endDateTime).getTime())) {
      throw new Error(`Invalid endDateTime: ${endDateTime}`);
    }

    const eventStartTime = new Date(startDateTime).getTime();
    const eventEndTime = new Date(endDateTime).getTime();
    const currentTime = Date.now();
    const hasEnded = eventEndTime < currentTime;

    const feedEntries = await ctx.db
      .query("userFeeds")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    for (const entry of feedEntries) {
      const oldDoc = entry;
      await ctx.db.patch(entry._id, {
        eventStartTime,
        eventEndTime,
        hasEnded,
      });
      const updatedDoc = (await ctx.db.get(entry._id))!;
      await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);
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

// Helper to upsert a feed entry (insert if missing, update timestamps if exists)
async function upsertFeedEntry(
  ctx: MutationCtx,
  feedId: string,
  eventId: string,
  eventStartTime: number,
  eventEndTime: number,
  addedAt: number,
): Promise<void> {
  const existingEntry = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_event", (q) =>
      q.eq("feedId", feedId).eq("eventId", eventId),
    )
    .first();

  const currentTime = Date.now();
  const hasEnded = eventEndTime < currentTime;

  if (!existingEntry) {
    const doc = {
      feedId,
      eventId,
      eventStartTime,
      eventEndTime,
      addedAt,
      hasEnded,
    };
    const id = await ctx.db.insert("userFeeds", doc);
    const insertedDoc = (await ctx.db.get(id))!;
    await userFeedsAggregate.replaceOrInsert(ctx, insertedDoc, insertedDoc);
  } else {
    const oldDoc = existingEntry;
    await ctx.db.patch(existingEntry._id, {
      eventStartTime,
      eventEndTime,
      hasEnded,
    });
    const updatedDoc = (await ctx.db.get(existingEntry._id))!;
    await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);
  }
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

      // Upsert into followedLists feed
      await upsertFeedEntry(
        ctx,
        followedListsFeedId,
        etl.eventId,
        eventStartTime,
        eventEndTime,
        currentTime,
      );

      // Upsert into personal feed
      const personalFeedId = `user_${userId}`;
      await upsertFeedEntry(
        ctx,
        personalFeedId,
        etl.eventId,
        eventStartTime,
        eventEndTime,
        currentTime,
      );
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
    const personalFeedId = `user_${userId}`;

    // Get all lists the user follows (excluding the one being unfollowed)
    // This is used to check if events are in other followed lists
    const userListFollows = await ctx.db
      .query("listFollows")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const followedListIds = new Set(userListFollows.map((f) => f.listId));
    followedListIds.delete(listId); // Exclude the list being unfollowed

    // Precompute which events from this list are also in other followed lists
    // This avoids querying eventToLists per event (O(n) queries -> O(m) queries where m = other lists)
    const eventIdsInThisList = new Set(eventToLists.map((etl) => etl.eventId));
    const eventsInOtherFollowedLists = new Set<string>();

    if (followedListIds.size > 0 && eventIdsInThisList.size > 0) {
      for (const otherListId of followedListIds) {
        const otherEventToLists = await ctx.db
          .query("eventToLists")
          .withIndex("by_list", (q) => q.eq("listId", otherListId))
          .collect();

        for (const other of otherEventToLists) {
          if (eventIdsInThisList.has(other.eventId)) {
            eventsInOtherFollowedLists.add(other.eventId);
          }
        }
      }
    }

    for (const etl of eventToLists) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", etl.eventId))
        .first();

      if (!event) {
        continue;
      }

      // Check if event is in another list the user follows (using precomputed set)
      const isInOtherFollowedList = eventsInOtherFollowedLists.has(etl.eventId);

      // Remove from followedLists feed only if event is not in any other followed list
      if (!isInOtherFollowedList) {
        const existingFollowedListsEntry = await ctx.db
          .query("userFeeds")
          .withIndex("by_feed_event", (q) =>
            q.eq("feedId", followedListsFeedId).eq("eventId", etl.eventId),
          )
          .first();

        if (existingFollowedListsEntry) {
          await userFeedsAggregate.deleteIfExists(
            ctx,
            existingFollowedListsEntry,
          );
          await ctx.db.delete(existingFollowedListsEntry._id);
        }
      }

      // Check if event should remain in personal feed before removing
      // Event should stay if:
      // 1. User created the event
      // 2. User follows the event directly (via eventFollows)
      // 3. Event is in another list the user follows
      const isCreator = event.userId === userId;
      if (isCreator) {
        // User created the event, so it should remain in personal feed
        continue;
      }

      // Check if user follows the event directly
      const eventFollow = await ctx.db
        .query("eventFollows")
        .withIndex("by_user_and_event", (q) =>
          q.eq("userId", userId).eq("eventId", etl.eventId),
        )
        .first();

      if (eventFollow) {
        // User follows the event directly, so it should remain in personal feed
        continue;
      }

      if (isInOtherFollowedList) {
        // Event is in another list the user follows, so it should remain in personal feed
        continue;
      }

      // Safe to remove from personal feed - user didn't create it,
      // doesn't follow it directly, and it's not in another followed list
      const existingPersonalEntry = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", personalFeedId).eq("eventId", etl.eventId),
        )
        .first();

      if (existingPersonalEntry) {
        await userFeedsAggregate.deleteIfExists(ctx, existingPersonalEntry);
        await ctx.db.delete(existingPersonalEntry._id);
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
      const personalFeedId = `user_${follow.userId}`;

      // Upsert into followedLists feed
      await upsertFeedEntry(
        ctx,
        followedListsFeedId,
        eventId,
        eventStartTime,
        eventEndTime,
        currentTime,
      );

      // Upsert into personal feed
      await upsertFeedEntry(
        ctx,
        personalFeedId,
        eventId,
        eventStartTime,
        eventEndTime,
        currentTime,
      );
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

    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", eventId))
      .first();

    if (!event) {
      return;
    }

    for (const follow of listFollows) {
      const followedListsFeedId = `followedLists_${follow.userId}`;
      const personalFeedId = `user_${follow.userId}`;

      // Check if event is in another list this user follows
      const userListFollows = await ctx.db
        .query("listFollows")
        .withIndex("by_user", (q) => q.eq("userId", follow.userId))
        .collect();

      const followedListIds = new Set(userListFollows.map((f) => f.listId));
      followedListIds.delete(listId);

      let isInOtherFollowedList = false;
      if (followedListIds.size > 0) {
        const otherEventToLists = await ctx.db
          .query("eventToLists")
          .withIndex("by_event", (q) => q.eq("eventId", eventId))
          .collect();

        isInOtherFollowedList = otherEventToLists.some((otherEtl) =>
          followedListIds.has(otherEtl.listId),
        );
      }

      // Remove from followedLists feed only if event is not in any other followed list
      if (!isInOtherFollowedList) {
        const existingFollowedListsEntry = await ctx.db
          .query("userFeeds")
          .withIndex("by_feed_event", (q) =>
            q.eq("feedId", followedListsFeedId).eq("eventId", eventId),
          )
          .first();

        if (existingFollowedListsEntry) {
          await userFeedsAggregate.deleteIfExists(
            ctx,
            existingFollowedListsEntry,
          );
          await ctx.db.delete(existingFollowedListsEntry._id);
        }
      }

      // Check if event should remain in personal feed before removing
      // Event should stay if:
      // 1. User created the event
      // 2. User follows the event directly (via eventFollows)
      // 3. Event is in another list the user follows
      const isCreator = event.userId === follow.userId;
      if (isCreator) {
        continue;
      }

      const eventFollow = await ctx.db
        .query("eventFollows")
        .withIndex("by_user_and_event", (q) =>
          q.eq("userId", follow.userId).eq("eventId", eventId),
        )
        .first();

      if (eventFollow) {
        continue;
      }

      if (isInOtherFollowedList) {
        continue;
      }

      const existingPersonalEntry = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", personalFeedId).eq("eventId", eventId),
        )
        .first();

      if (existingPersonalEntry) {
        await userFeedsAggregate.deleteIfExists(ctx, existingPersonalEntry);
        await ctx.db.delete(existingPersonalEntry._id);
      }
    }
  },
});
