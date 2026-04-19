import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { addEventToListFeedInline } from "../feedHelpers";

/**
 * Backfill `list_${listId}` userFeeds entries from the current `eventToLists`
 * junction so the list-detail query can paginate efficiently on the
 * `by_feed_visibility_hasEnded_startTime` index.
 *
 * Must be run once after deploying the write-path changes in
 * `addEventToList` / `removeEventFromList` / `addEventToContributorLists` /
 * `backfillContributorEventsBatch` / `removeContributorEventsBatch`. New
 * writes after those changes maintain the feed themselves; this only catches
 * up existing data.
 *
 * Idempotent: `addEventToListFeedInline` upserts via `by_feed_event`, so
 * re-running the migration just refreshes timestamps on already-populated
 * entries.
 */
export const backfillListFeedsBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    upserted: v.number(),
    skipped: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const result = await ctx.db
      .query("eventToLists")
      .paginate({ numItems: batchSize, cursor });

    let upserted = 0;
    let skipped = 0;

    for (const etl of result.page) {
      // addEventToListFeedInline returns false when the event row is
      // missing — eventToLists can outlive its event during cascades or
      // partial cleanups. Track those separately so the orchestrator log
      // distinguishes real upserts from dangling-junction skips.
      const didUpsert = await addEventToListFeedInline(
        ctx,
        etl.eventId,
        etl.listId,
      );
      if (didUpsert) {
        upserted++;
      } else {
        skipped++;
      }
    }

    return {
      processed: result.page.length,
      upserted,
      skipped,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const runBackfillListFeeds = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    let totalProcessed = 0;
    let totalUpserted = 0;
    let totalSkipped = 0;
    let cursor: string | null = null;
    const batchSize = 50;

    while (true) {
      const result: {
        processed: number;
        upserted: number;
        skipped: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.migrations.backfillListFeeds.backfillListFeedsBatch,
        { cursor, batchSize },
      );

      totalProcessed += result.processed;
      totalUpserted += result.upserted;
      totalSkipped += result.skipped;

      if (result.isDone) break;
      if (result.nextCursor === cursor) {
        console.error("Cursor stalled in backfillListFeeds — aborting");
        break;
      }
      cursor = result.nextCursor;
    }

    console.log(
      `list feed backfill: ${totalProcessed} eventToLists processed, ${totalUpserted} feed entries upserted, ${totalSkipped} skipped (missing event)`,
    );
    return null;
  },
});
