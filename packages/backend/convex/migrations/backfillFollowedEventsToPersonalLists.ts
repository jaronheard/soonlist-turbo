import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { addEventToListFeedInline } from "../feedHelpers";
import { getOrCreatePersonalList } from "../lists";

const DEFAULT_BATCH_SIZE = 50;

/**
 * Backfill direct event follows into each follower's personal Soonlist.
 *
 * Idempotent: existing eventToLists links are skipped via by_event_and_list.
 * Each follower-feed fan-out is scheduled separately so a large personal-list
 * audience does not count against this batch transaction.
 */
export const backfillFollowedEventsToPersonalListsBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    linked: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const result = await ctx.db
      .query("eventFollows")
      .paginate({ numItems: batchSize, cursor });

    let linked = 0;
    const personalListIdsByUser = new Map<string, string>();

    for (const follow of result.page) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", follow.eventId))
        .first();

      if (!event) {
        continue;
      }

      let personalListId = personalListIdsByUser.get(follow.userId);
      if (!personalListId) {
        const personalList = await getOrCreatePersonalList(ctx, follow.userId);
        personalListId = personalList.id;
        personalListIdsByUser.set(follow.userId, personalListId);
      }

      const existing = await ctx.db
        .query("eventToLists")
        .withIndex("by_event_and_list", (q) =>
          q.eq("eventId", follow.eventId).eq("listId", personalListId),
        )
        .first();

      if (existing) {
        continue;
      }

      await ctx.db.insert("eventToLists", {
        eventId: follow.eventId,
        listId: personalListId,
      });
      await addEventToListFeedInline(ctx, follow.eventId, personalListId);
      await ctx.scheduler.runAfter(
        0,
        internal.feedHelpers.addEventToListFollowersFeeds,
        {
          eventId: follow.eventId,
          listId: personalListId,
        },
      );
      linked++;
    }

    const nextCursor = result.isDone ? null : result.continueCursor;

    if (!result.isDone && result.page.length === 0) {
      throw new Error(
        `backfillFollowedEventsToPersonalListsBatch: paginator returned an empty page at cursor ${cursor} before completion`,
      );
    }

    if (!result.isDone && nextCursor !== cursor) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillFollowedEventsToPersonalLists
          .backfillFollowedEventsToPersonalListsBatch,
        {
          cursor: nextCursor,
          batchSize,
        },
      );
    } else if (!result.isDone) {
      throw new Error(
        `backfillFollowedEventsToPersonalListsBatch: cursor stalled at ${cursor} after ${result.page.length} follows - aborting`,
      );
    }

    return {
      processed: result.page.length,
      linked,
      nextCursor,
      isDone: result.isDone,
    };
  },
});

export const backfillFollowedEventsToPersonalLists = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { batchSize }) => {
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.backfillFollowedEventsToPersonalLists
        .backfillFollowedEventsToPersonalListsBatch,
      {
        cursor: null,
        batchSize: batchSize ?? DEFAULT_BATCH_SIZE,
      },
    );
    return null;
  },
});
