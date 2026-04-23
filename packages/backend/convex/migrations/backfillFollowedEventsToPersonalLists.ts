import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { addEventToListFeedInline } from "../feedHelpers";
import { getOrCreatePersonalList } from "../lists";

/**
 * Batch migration: ensure each eventFollow has a matching membership in the
 * follower's personal list.
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

    for (const follow of result.page) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", follow.eventId))
        .first();

      if (!event) {
        continue;
      }

      const personalList = await getOrCreatePersonalList(ctx, follow.userId);
      const existingLink = await ctx.db
        .query("eventToLists")
        .withIndex("by_event_and_list", (q) =>
          q.eq("eventId", follow.eventId).eq("listId", personalList.id),
        )
        .first();

      if (existingLink) {
        continue;
      }

      await ctx.db.insert("eventToLists", {
        eventId: follow.eventId,
        listId: personalList.id,
      });
      await addEventToListFeedInline(ctx, follow.eventId, personalList.id);

      // Schedule feed population in a separate transaction to avoid
      // hitting transaction limits when there are many followers
      await ctx.scheduler.runAfter(
        0,
        internal.feedHelpers.addEventToListFollowersFeeds,
        {
          eventId: follow.eventId,
          listId: personalList.id,
        },
      );

      linked++;
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillFollowedEventsToPersonalLists
          .backfillFollowedEventsToPersonalListsBatch,
        { cursor: result.continueCursor, batchSize },
      );
    }

    return {
      processed: result.page.length,
      linked,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * Orchestrator: kicks off the batched backfill. Subsequent batches
 * self-schedule until `isDone`.
 */
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
      { cursor: null, batchSize: batchSize ?? 100 },
    );
    return null;
  },
});
