import { v } from "convex/values";

import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { userFeedsAggregate } from "./aggregates";

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
    if (visibility === "public") {
      const creator = await ctx.db
        .query("users")
        .withIndex("by_custom_id", (q) => q.eq("id", userId))
        .first();
      const showDiscover =
        (creator?.publicMetadata as { showDiscover?: boolean } | null)
          ?.showDiscover ?? false;

      if (showDiscover) {
        await upsertFeedEntry(
          ctx,
          "discover",
          eventId,
          eventStartTime,
          eventEndTime,
          currentTime,
          similarityGroupId,
          visibility,
        );
      }
    }
    if (visibility === "public") {
      await ctx.scheduler.runAfter(
        0,
        internal.feedHelpers.addEventToContributorLists,
        { eventId, userId },
      );
    }
  },
});

export const addEventToUserFeed = internalMutation({
  args: {
    userId: v.string(),
    eventId: v.string(),
  },
  handler: async (ctx, { userId, eventId }) => {
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

      if (similarityGroupId) {
        await ctx.runMutation(
          internal.feedGroupHelpers.upsertGroupedFeedEntry,
          { feedId, similarityGroupId },
        );
      }
    }
  },
});

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

    const affectedGroups: { feedId: string; similarityGroupId: string }[] = [];

    for (const entry of feedEntries) {
      if (entry.eventVisibility !== visibility) {
        const oldDoc = entry;
        await ctx.db.patch(entry._id, { eventVisibility: visibility });
        const updatedDoc = { ...entry, eventVisibility: visibility };
        await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);

        if (entry.similarityGroupId) {
          affectedGroups.push({
            feedId: entry.feedId,
            similarityGroupId: entry.similarityGroupId,
          });
        }
      }
    }

    for (const { feedId, similarityGroupId } of affectedGroups) {
      await ctx.runMutation(internal.feedGroupHelpers.upsertGroupedFeedEntry, {
        feedId,
        similarityGroupId,
      });
    }

    return null;
  },
});

export const removeEventFromFeeds = internalMutation({
  args: {
    eventId: v.string(),
    keepCreatorFeed: v.optional(v.boolean()),
    keepListFeeds: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { eventId, keepCreatorFeed = true, keepListFeeds = true },
  ) => {
    const feedEntries = await ctx.db
      .query("userFeeds")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    let event = null;
    if (keepCreatorFeed) {
      event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", eventId))
        .first();
    }

    const affectedGroups: { feedId: string; similarityGroupId: string }[] = [];

    for (const entry of feedEntries) {
      if (keepCreatorFeed && event && entry.feedId === `user_${event.userId}`) {
        continue;
      }

      if (keepListFeeds && entry.feedId.startsWith("list_")) {
        continue;
      }

      if (entry.similarityGroupId) {
        affectedGroups.push({
          feedId: entry.feedId,
          similarityGroupId: entry.similarityGroupId,
        });
      }

      await userFeedsAggregate.deleteIfExists(ctx, entry);
      await ctx.db.delete(entry._id);
    }

    for (const group of affectedGroups) {
      await ctx.runMutation(
        internal.feedGroupHelpers.upsertGroupedFeedEntry,
        group,
      );
    }
  },
});

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

    const affectedGroups = new Set<string>();

    for (const entry of feedEntries) {
      const oldDoc = entry;
      await ctx.db.patch(entry._id, {
        eventStartTime,
        eventEndTime,
        hasEnded,
      });
      const updatedDoc = { ...entry, eventStartTime, eventEndTime, hasEnded };
      await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);

      if (entry.similarityGroupId) {
        affectedGroups.add(`${entry.feedId}:${entry.similarityGroupId}`);
      }
    }

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

export async function upsertFeedEntry(
  ctx: MutationCtx,
  feedId: string,
  eventId: string,
  eventStartTime: number,
  eventEndTime: number,
  addedAt: number,
  similarityGroupId?: string,
  eventVisibility?: "public" | "private",
  sourceListId?: string,
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
      sourceListId,
    };
    const id = await ctx.db.insert("userFeeds", doc);
    const insertedDoc = (await ctx.db.get(id))!;
    await userFeedsAggregate.replaceOrInsert(ctx, insertedDoc, insertedDoc);

    if (similarityGroupId) {
      await ctx.runMutation(internal.feedGroupHelpers.upsertGroupedFeedEntry, {
        feedId,
        similarityGroupId,
      });
    }
  } else {
    const oldDoc = existingEntry;
    const patchFields = {
      eventStartTime,
      eventEndTime,
      hasEnded,
      ...(similarityGroupId && { similarityGroupId }),
      ...(eventVisibility && { eventVisibility }),
      ...(!existingEntry.sourceListId && sourceListId ? { sourceListId } : {}),
    };
    await ctx.db.patch(existingEntry._id, patchFields);
    const updatedDoc = { ...existingEntry, ...patchFields };
    await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);

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

      await upsertFeedEntry(
        ctx,
        followedListsFeedId,
        etl.eventId,
        eventStartTime,
        eventEndTime,
        currentTime,
        similarityGroupId,
        event.visibility,
        listId, // sourceListId
      );
    }
  },
});

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

    const userListFollows = await ctx.db
      .query("listFollows")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const followedListIds = new Set(userListFollows.map((f) => f.listId));
    followedListIds.delete(listId);

    const eventIdsInThisList = new Set(eventToLists.map((etl) => etl.eventId));
    const eventsInOtherFollowedLists = new Set<string>();
    const eventToReplacementList = new Map<string, string>();

    if (followedListIds.size > 0 && eventIdsInThisList.size > 0) {
      for (const otherListId of followedListIds) {
        const otherEventToLists = await ctx.db
          .query("eventToLists")
          .withIndex("by_list", (q) => q.eq("listId", otherListId))
          .collect();

        for (const other of otherEventToLists) {
          if (eventIdsInThisList.has(other.eventId)) {
            eventsInOtherFollowedLists.add(other.eventId);
            if (!eventToReplacementList.has(other.eventId)) {
              eventToReplacementList.set(other.eventId, otherListId);
            }
          }
        }
      }
    }

    for (const etl of eventToLists) {
      const isInOtherFollowedList = eventsInOtherFollowedLists.has(etl.eventId);

      const existingFollowedListsEntry = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", followedListsFeedId).eq("eventId", etl.eventId),
        )
        .first();

      if (!existingFollowedListsEntry) {
        continue;
      }

      if (!isInOtherFollowedList) {
        const similarityGroupId = existingFollowedListsEntry.similarityGroupId;
        await userFeedsAggregate.deleteIfExists(
          ctx,
          existingFollowedListsEntry,
        );
        await ctx.db.delete(existingFollowedListsEntry._id);

        if (similarityGroupId) {
          await ctx.runMutation(
            internal.feedGroupHelpers.upsertGroupedFeedEntry,
            { feedId: followedListsFeedId, similarityGroupId },
          );
        }
      } else if (existingFollowedListsEntry.sourceListId === listId) {
        const newSourceListId = eventToReplacementList.get(etl.eventId);
        if (newSourceListId) {
          const oldDoc = existingFollowedListsEntry;
          await ctx.db.patch(existingFollowedListsEntry._id, {
            sourceListId: newSourceListId,
          });
          const updatedDoc = (await ctx.db.get(
            existingFollowedListsEntry._id,
          ))!;
          await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);
        }
      }
    }
  },
});

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

      await upsertFeedEntry(
        ctx,
        followedListsFeedId,
        eventId,
        eventStartTime,
        eventEndTime,
        currentTime,
        similarityGroupId,
        event.visibility,
        listId, // sourceListId
      );
    }
  },
});

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

    if (listFollows.length === 0) return;

    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", eventId))
      .first();

    if (!event) {
      return;
    }

    const eventListMemberships = await ctx.db
      .query("eventToLists")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();
    const eventListIds = new Set(eventListMemberships.map((etl) => etl.listId));
    eventListIds.delete(listId);

    for (const follow of listFollows) {
      const followedListsFeedId = `followedLists_${follow.userId}`;

      const userListFollows = await ctx.db
        .query("listFollows")
        .withIndex("by_user", (q) => q.eq("userId", follow.userId))
        .collect();

      const followedListIds = new Set(userListFollows.map((f) => f.listId));

      const isInOtherFollowedList = [...eventListIds].some((lid) =>
        followedListIds.has(lid),
      );

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

          if (similarityGroupId) {
            await ctx.runMutation(
              internal.feedGroupHelpers.upsertGroupedFeedEntry,
              { feedId: followedListsFeedId, similarityGroupId },
            );
          }
        }
      }
    }
  },
});

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
    const followedUsersFeedId = `followedUsers_${userId}`;

    const result = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", followedUserId))
      .paginate({ numItems: batchSize, cursor });

    let added = 0;

    for (const event of result.page) {
      if (event.visibility !== "public") {
        continue;
      }

      const eventStartTime = new Date(event.startDateTime).getTime();
      const eventEndTime = new Date(event.endDateTime).getTime();

      if (eventEndTime < currentTime) {
        continue;
      }

      const similarityGroupId = event.similarityGroupId;

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
    const batchSize = 100;

    while (true) {
      const result: {
        processed: number;
        added: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.feedHelpers.addUserEventsToUserFeedBatch,
        {
          userId,
          followedUserId,
          cursor,
          batchSize,
        },
      );

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

export const addUserEventsToUserFeed = internalMutation({
  args: {
    userId: v.string(),
    followedUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { userId, followedUserId }) => {
    await ctx.scheduler.runAfter(
      0,
      internal.feedHelpers.addUserEventsToUserFeedAction,
      {
        userId,
        followedUserId,
      },
    );
    return null;
  },
});

export const addEventToContributorLists = internalMutation({
  args: {
    eventId: v.string(),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { eventId, userId }) => {
    const contributorMemberships = await ctx.db
      .query("listMembers")
      .withIndex("by_user_and_role", (q) =>
        q.eq("userId", userId).eq("role", "contributor"),
      )
      .collect();

    if (contributorMemberships.length === 0) {
      return null;
    }

    for (const membership of contributorMemberships) {
      const list = await ctx.db
        .query("lists")
        .withIndex("by_custom_id", (q) => q.eq("id", membership.listId))
        .first();

      if (list?.listType !== "contributor") {
        continue;
      }

      const existing = await ctx.db
        .query("eventToLists")
        .withIndex("by_event_and_list", (q) =>
          q.eq("eventId", eventId).eq("listId", membership.listId),
        )
        .first();

      if (!existing) {
        await ctx.db.insert("eventToLists", {
          eventId,
          listId: membership.listId,
        });

        await addEventToListFeedInline(ctx, eventId, membership.listId);

        await ctx.scheduler.runAfter(
          0,
          internal.feedHelpers.addEventToListFollowersFeeds,
          {
            eventId,
            listId: membership.listId,
          },
        );
      }
    }

    return null;
  },
});

export const removeUserEventsFromUserFeed = internalMutation({
  args: {
    userId: v.string(),
    unfollowedUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { userId, unfollowedUserId }) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", unfollowedUserId))
      .collect();

    const followedUsersFeedId = `followedUsers_${userId}`;

    for (const event of events) {
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

export function listFeedId(listId: string): string {
  return `list_${listId}`;
}

export async function addEventToListFeedInline(
  ctx: MutationCtx,
  eventId: string,
  listId: string,
): Promise<boolean> {
  const event = await ctx.db
    .query("events")
    .withIndex("by_custom_id", (q) => q.eq("id", eventId))
    .first();

  if (!event) {
    return false;
  }

  const eventStartTime = new Date(event.startDateTime).getTime();
  const eventEndTime = new Date(event.endDateTime).getTime();
  const currentTime = Date.now();

  await upsertFeedEntry(
    ctx,
    listFeedId(listId),
    eventId,
    eventStartTime,
    eventEndTime,
    currentTime,
    event.similarityGroupId,
    event.visibility,
  );
  return true;
}

export async function removeEventFromListFeedInline(
  ctx: MutationCtx,
  eventId: string,
  listId: string,
): Promise<void> {
  const feedId = listFeedId(listId);
  const entry = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_event", (q) =>
      q.eq("feedId", feedId).eq("eventId", eventId),
    )
    .first();

  if (!entry) return;

  const similarityGroupId = entry.similarityGroupId;
  await userFeedsAggregate.deleteIfExists(ctx, entry);
  await ctx.db.delete(entry._id);

  if (similarityGroupId) {
    await ctx.runMutation(internal.feedGroupHelpers.upsertGroupedFeedEntry, {
      feedId,
      similarityGroupId,
    });
  }
}

export const removeListFeedBatch = internalMutation({
  args: {
    listId: v.string(),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    removed: v.number(),
  }),
  handler: async (ctx, { listId, batchSize }) => {
    const feedId = listFeedId(listId);
    const entries = await ctx.db
      .query("userFeeds")
      .withIndex("by_feed_hasEnded_startTime", (q) => q.eq("feedId", feedId))
      .take(batchSize);

    const affectedGroups = new Set<string>();
    let removed = 0;

    for (const entry of entries) {
      if (entry.similarityGroupId) {
        affectedGroups.add(entry.similarityGroupId);
      }
      await userFeedsAggregate.deleteIfExists(ctx, entry);
      await ctx.db.delete(entry._id);
      removed++;
    }

    for (const similarityGroupId of affectedGroups) {
      await ctx.runMutation(internal.feedGroupHelpers.upsertGroupedFeedEntry, {
        feedId,
        similarityGroupId,
      });
    }

    return {
      processed: entries.length,
      removed,
    };
  },
});

export const removeListFeedAction = internalAction({
  args: { listId: v.string() },
  returns: v.null(),
  handler: async (ctx, { listId }) => {
    while (true) {
      const result: {
        processed: number;
        removed: number;
      } = await ctx.runMutation(internal.feedHelpers.removeListFeedBatch, {
        listId,
        batchSize: 100,
      });
      if (result.processed === 0) break;
    }
    return null;
  },
});
