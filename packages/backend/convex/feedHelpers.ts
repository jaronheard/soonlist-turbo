import { v } from "convex/values";

import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { userFeedsAggregate } from "./aggregates";

// Helper to add an event to feeds when it's created or updated
export const updateEventInFeeds = internalMutation({
  args: {
    eventId: v.string(),
    userId: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    startDateTime: v.string(),
    endDateTime: v.string(),
    similarityGroupId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    {
      eventId,
      userId,
      visibility,
      startDateTime,
      endDateTime,
      similarityGroupId,
    },
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
      similarityGroupId,
      visibility,
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
        similarityGroupId,
        visibility,
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
        similarityGroupId,
        visibility,
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
    // Get the event to get its start time and similarityGroupId
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
    const similarityGroupId = event.similarityGroupId;

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
        hasEnded: eventEndTime < currentTime,
        similarityGroupId,
        eventVisibility: event.visibility,
      };
      const id = await ctx.db.insert("userFeeds", doc);
      const insertedDoc = (await ctx.db.get(id))!;
      await userFeedsAggregate.replaceOrInsert(ctx, insertedDoc, insertedDoc);

      // Update grouped feed entry if similarityGroupId exists
      if (similarityGroupId) {
        await ctx.runMutation(
          internal.feedGroupHelpers.upsertGroupedFeedEntry,
          { feedId, similarityGroupId },
        );
      }
    }
  },
});

// Helper to update event visibility across all feed entries for an event
export const updateEventVisibilityInFeeds = internalMutation({
  args: {
    eventId: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  returns: v.null(),
  handler: async (ctx, { eventId, visibility }) => {
    const feedEntries = await ctx.db
      .query("userFeeds")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    // Track affected (feedId, similarityGroupId) pairs for grouped feed updates
    const affectedGroups: { feedId: string; similarityGroupId: string }[] = [];

    for (const entry of feedEntries) {
      if (entry.eventVisibility !== visibility) {
        const oldDoc = entry;
        await ctx.db.patch(entry._id, { eventVisibility: visibility });
        const updatedDoc = (await ctx.db.get(entry._id))!;
        await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);

        // Track the group for later update
        if (entry.similarityGroupId) {
          affectedGroups.push({
            feedId: entry.feedId,
            similarityGroupId: entry.similarityGroupId,
          });
        }
      }
    }

    // Update grouped feed entries for affected groups
    for (const { feedId, similarityGroupId } of affectedGroups) {
      await ctx.runMutation(internal.feedGroupHelpers.upsertGroupedFeedEntry, {
        feedId,
        similarityGroupId,
      });
    }

    return null;
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

    // Track affected (feedId, similarityGroupId) pairs for grouped feed updates
    const affectedGroups: { feedId: string; similarityGroupId: string }[] = [];

    for (const entry of feedEntries) {
      // If keepCreatorFeed is true, skip only the creator's feed
      if (keepCreatorFeed && event && entry.feedId === `user_${event.userId}`) {
        continue;
      }

      // Track the group for later update
      if (entry.similarityGroupId) {
        affectedGroups.push({
          feedId: entry.feedId,
          similarityGroupId: entry.similarityGroupId,
        });
      }

      // Delete all other entries (including discover and other user feeds)
      await userFeedsAggregate.deleteIfExists(ctx, entry);
      await ctx.db.delete(entry._id);
    }

    // Update grouped feed entries for affected groups
    for (const group of affectedGroups) {
      await ctx.runMutation(
        internal.feedGroupHelpers.upsertGroupedFeedEntry,
        group,
      );
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

    // Track affected (feedId, similarityGroupId) pairs for grouped feed updates
    const affectedGroups = new Set<string>();

    for (const entry of feedEntries) {
      const oldDoc = entry;
      await ctx.db.patch(entry._id, {
        eventStartTime,
        eventEndTime,
        hasEnded,
      });
      const updatedDoc = (await ctx.db.get(entry._id))!;
      await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);

      // Track the group for later update
      if (entry.similarityGroupId) {
        affectedGroups.add(`${entry.feedId}:${entry.similarityGroupId}`);
      }
    }

    // Update grouped feed entries for affected groups
    for (const pair of affectedGroups) {
      const [feedId, similarityGroupId] = pair.split(":");
      if (feedId && similarityGroupId) {
        await ctx.runMutation(
          internal.feedGroupHelpers.upsertGroupedFeedEntry,
          { feedId, similarityGroupId },
        );
      }
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
  similarityGroupId?: string,
  eventVisibility?: "public" | "private",
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
      similarityGroupId,
      eventVisibility,
    };
    const id = await ctx.db.insert("userFeeds", doc);
    const insertedDoc = (await ctx.db.get(id))!;
    await userFeedsAggregate.replaceOrInsert(ctx, insertedDoc, insertedDoc);

    // Update grouped feed entry if similarityGroupId exists
    if (similarityGroupId) {
      await ctx.runMutation(internal.feedGroupHelpers.upsertGroupedFeedEntry, {
        feedId,
        similarityGroupId,
      });
    }
  } else {
    const oldDoc = existingEntry;
    // Also update similarityGroupId and eventVisibility if provided (for migration scenarios)
    await ctx.db.patch(existingEntry._id, {
      eventStartTime,
      eventEndTime,
      hasEnded,
      ...(similarityGroupId && { similarityGroupId }),
      ...(eventVisibility && { eventVisibility }),
    });
    const updatedDoc = (await ctx.db.get(existingEntry._id))!;
    await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);

    // Update grouped feed entry if similarityGroupId exists
    const effectiveGroupId =
      similarityGroupId || existingEntry.similarityGroupId;
    if (effectiveGroupId) {
      await ctx.runMutation(internal.feedGroupHelpers.upsertGroupedFeedEntry, {
        feedId,
        similarityGroupId: effectiveGroupId,
      });
    }
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
      const similarityGroupId = event.similarityGroupId;

      // Upsert into followedLists feed
      await upsertFeedEntry(
        ctx,
        followedListsFeedId,
        etl.eventId,
        eventStartTime,
        eventEndTime,
        currentTime,
        similarityGroupId,
        event.visibility,
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
        similarityGroupId,
        event.visibility,
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
          const similarityGroupId =
            existingFollowedListsEntry.similarityGroupId;
          await userFeedsAggregate.deleteIfExists(
            ctx,
            existingFollowedListsEntry,
          );
          await ctx.db.delete(existingFollowedListsEntry._id);

          // Update grouped feed entry
          if (similarityGroupId) {
            await ctx.runMutation(
              internal.feedGroupHelpers.upsertGroupedFeedEntry,
              { feedId: followedListsFeedId, similarityGroupId },
            );
          }
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
        const similarityGroupId = existingPersonalEntry.similarityGroupId;
        await userFeedsAggregate.deleteIfExists(ctx, existingPersonalEntry);
        await ctx.db.delete(existingPersonalEntry._id);

        // Update grouped feed entry
        if (similarityGroupId) {
          await ctx.runMutation(
            internal.feedGroupHelpers.upsertGroupedFeedEntry,
            { feedId: personalFeedId, similarityGroupId },
          );
        }
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
    const similarityGroupId = event.similarityGroupId;

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
        similarityGroupId,
        event.visibility,
      );

      // Upsert into personal feed
      await upsertFeedEntry(
        ctx,
        personalFeedId,
        eventId,
        eventStartTime,
        eventEndTime,
        currentTime,
        similarityGroupId,
        event.visibility,
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
          const similarityGroupId =
            existingFollowedListsEntry.similarityGroupId;
          await userFeedsAggregate.deleteIfExists(
            ctx,
            existingFollowedListsEntry,
          );
          await ctx.db.delete(existingFollowedListsEntry._id);

          // Update grouped feed entry
          if (similarityGroupId) {
            await ctx.runMutation(
              internal.feedGroupHelpers.upsertGroupedFeedEntry,
              { feedId: followedListsFeedId, similarityGroupId },
            );
          }
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
        const similarityGroupId = existingPersonalEntry.similarityGroupId;
        await userFeedsAggregate.deleteIfExists(ctx, existingPersonalEntry);
        await ctx.db.delete(existingPersonalEntry._id);

        // Update grouped feed entry
        if (similarityGroupId) {
          await ctx.runMutation(
            internal.feedGroupHelpers.upsertGroupedFeedEntry,
            { feedId: personalFeedId, similarityGroupId },
          );
        }
      }
    }
  },
});

// Helper to add all public upcoming events from a followed user to the follower's "Following" feed
// This is the batch mutation that processes a page of events at a time
export const addUserEventsToUserFeedBatch = internalMutation({
  args: {
    userId: v.string(),
    followedUserId: v.string(),
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    added: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { userId, followedUserId, cursor, batchSize }) => {
    const currentTime = Date.now();
    const currentTimeISO = new Date().toISOString();
    const followedUsersFeedId = `followedUsers_${userId}`;

    // Query events with pagination
    const result = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", followedUserId))
      .paginate({ numItems: batchSize, cursor });

    let added = 0;

    for (const event of result.page) {
      // Only add public upcoming events
      if (event.visibility !== "public") {
        continue;
      }

      // Skip past events (endDateTime < now)
      if (event.endDateTime < currentTimeISO) {
        continue;
      }

      const eventStartTime = new Date(event.startDateTime).getTime();
      const eventEndTime = new Date(event.endDateTime).getTime();
      const similarityGroupId = event.similarityGroupId;

      // Check if already in feed
      const existing = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", followedUsersFeedId).eq("eventId", event.id),
        )
        .first();

      if (!existing) {
        const doc = {
          feedId: followedUsersFeedId,
          eventId: event.id,
          eventStartTime,
          eventEndTime,
          addedAt: currentTime,
          hasEnded: eventEndTime < currentTime,
          similarityGroupId,
          eventVisibility: event.visibility,
        };
        const id = await ctx.db.insert("userFeeds", doc);
        const insertedDoc = (await ctx.db.get(id))!;
        await userFeedsAggregate.replaceOrInsert(ctx, insertedDoc, insertedDoc);

        // Update grouped feed entry if similarityGroupId exists
        if (similarityGroupId) {
          await ctx.runMutation(
            internal.feedGroupHelpers.upsertGroupedFeedEntry,
            { feedId: followedUsersFeedId, similarityGroupId },
          );
        }
        added++;
      }
    }

    return {
      processed: result.page.length,
      added,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

// Action to orchestrate adding user events to feed in batches
export const addUserEventsToUserFeedAction = internalAction({
  args: {
    userId: v.string(),
    followedUserId: v.string(),
  },
  returns: v.object({
    totalProcessed: v.number(),
    totalAdded: v.number(),
  }),
  handler: async (ctx, { userId, followedUserId }) => {
    let totalProcessed = 0;
    let totalAdded = 0;
    let cursor: string | null = null;
    const batchSize = 100; // Process 100 events per batch

    // Process batches until no more data
    while (true) {
      const result: {
        processed: number;
        added: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(internal.feedHelpers.addUserEventsToUserFeedBatch, {
        userId,
        followedUserId,
        cursor,
        batchSize,
      });

      totalProcessed += result.processed;
      totalAdded += result.added;

      if (result.isDone) {
        break;
      }
      cursor = result.nextCursor;
    }

    console.log(
      `Added ${totalAdded} events to feed for user ${userId} from followed user ${followedUserId} (processed ${totalProcessed})`,
    );

    return {
      totalProcessed,
      totalAdded,
    };
  },
});

// Legacy mutation kept for backwards compatibility - schedules the action
export const addUserEventsToUserFeed = internalMutation({
  args: {
    userId: v.string(),
    followedUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { userId, followedUserId }) => {
    // Schedule the action to run immediately
    await ctx.scheduler.runAfter(0, internal.feedHelpers.addUserEventsToUserFeedAction, {
      userId,
      followedUserId,
    });
    return null;
  },
});

// Helper to remove all events from an unfollowed user from the follower's "Following" feed
export const removeUserEventsFromUserFeed = internalMutation({
  args: {
    userId: v.string(),
    unfollowedUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { userId, unfollowedUserId }) => {
    // Get all events from the unfollowed user
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", unfollowedUserId))
      .collect();

    const followedUsersFeedId = `followedUsers_${userId}`;

    for (const event of events) {
      // Remove from followedUsers feed (Following tab only)
      const existingEntry = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", followedUsersFeedId).eq("eventId", event.id),
        )
        .first();

      if (existingEntry) {
        const similarityGroupId = existingEntry.similarityGroupId;
        await userFeedsAggregate.deleteIfExists(ctx, existingEntry);
        await ctx.db.delete(existingEntry._id);

        // Update grouped feed entry
        if (similarityGroupId) {
          await ctx.runMutation(
            internal.feedGroupHelpers.upsertGroupedFeedEntry,
            { feedId: followedUsersFeedId, similarityGroupId },
          );
        }
      }
    }

    return null;
  },
});
