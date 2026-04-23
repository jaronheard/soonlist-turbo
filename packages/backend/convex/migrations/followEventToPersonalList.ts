import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { getOrCreatePersonalList } from "../lists";
import { addEventToList } from "../model/events";

/**
 * Batch mutation: for each eventFollows row where the follower is not the
 * creator, ensure the event is linked to the follower's personal list.
 * This backfills the invariant enforced by the updated followEvent: a
 * user's personal list reflects every event they've saved, so their
 * subscribers see those events via the existing list fanout.
 *
 * addEventToList is idempotent — rows that already exist are no-ops, so
 * this migration is safe to re-run.
 */
export const followEventToPersonalListBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    backfilled: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const result = await ctx.db
      .query("eventFollows")
      .paginate({ numItems: batchSize, cursor });

    let backfilled = 0;

    for (const follow of result.page) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", follow.eventId))
        .first();

      if (!event) continue;
      if (event.userId === follow.userId) continue;

      const personalList = await getOrCreatePersonalList(ctx, follow.userId);

      const existing = await ctx.db
        .query("eventToLists")
        .withIndex("by_event_and_list", (q) =>
          q.eq("eventId", follow.eventId).eq("listId", personalList.id),
        )
        .first();

      if (existing) continue;

      await addEventToList(ctx, follow.eventId, personalList.id, follow.userId);
      backfilled++;
    }

    return {
      processed: result.page.length,
      backfilled,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * Action: orchestrate the backfill of eventFollows → personal list
 * memberships. Small batch size — addEventToList fans out to every
 * subscriber of the follower's personal list inline, so work per
 * eventFollow row scales with that user's subscriber count.
 */
export const runFollowEventToPersonalList = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    let totalProcessed = 0;
    let totalBackfilled = 0;
    let cursor: string | null = null;
    const batchSize = 25;

    while (true) {
      const result: {
        processed: number;
        backfilled: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.migrations.followEventToPersonalList
          .followEventToPersonalListBatch,
        { cursor, batchSize },
      );

      totalProcessed += result.processed;
      totalBackfilled += result.backfilled;

      if (result.isDone) break;
      if (result.nextCursor === cursor) {
        console.error("Cursor stalled in followEventToPersonalList — aborting");
        break;
      }
      cursor = result.nextCursor;
    }

    console.log(
      `eventFollows → personal list backfill: ${totalProcessed} processed, ${totalBackfilled} backfilled`,
    );
    return null;
  },
});
