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

/**
 * Phase 2: once the feed entries are populated, mark every list so
 * `getEventsForList` can trust the feed directly (O(1) field check)
 * instead of falling back to a junction scan. Idempotent: only lists
 * missing `feedBackfilledAt` get patched.
 */
export const markListsBackfilledBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    marked: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const result = await ctx.db
      .query("lists")
      .paginate({ numItems: batchSize, cursor });

    const now = new Date().toISOString();
    let marked = 0;

    for (const list of result.page) {
      if (list.feedBackfilledAt) continue;
      await ctx.db.patch(list._id, { feedBackfilledAt: now });
      marked++;
    }

    return {
      processed: result.page.length,
      marked,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const runBackfillListFeeds = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Phase 1: mirror every eventToLists row into a `list_${listId}` feed
    // entry. Safe to re-run; upserts are keyed on (feedId, eventId).
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
        // Throwing instead of breaking: stalling here means phase 1 only
        // partially populated the feed. If we fell through to phase 2 we'd
        // stamp `feedBackfilledAt` on every list, silencing the
        // getEventsForList fallback even though many list_* feeds are
        // still incomplete. Fail loud so an operator can investigate and
        // re-run rather than leave users with quietly-wrong lists.
        throw new Error(
          `Cursor stalled in backfillListFeeds after ${totalProcessed} rows — phase 2 not run`,
        );
      }
      cursor = result.nextCursor;
    }

    console.log(
      `list feed backfill phase 1: ${totalProcessed} eventToLists processed, ${totalUpserted} feed entries upserted, ${totalSkipped} skipped (missing event)`,
    );

    // Phase 2: stamp every list with `feedBackfilledAt`. Once phase 1
    // committed its last row, this marker is safe — it tells
    // getEventsForList that the feed is authoritative for this list and
    // the junction-scan fallback can be skipped.
    let totalListsProcessed = 0;
    let totalMarked = 0;
    let listCursor: string | null = null;

    while (true) {
      const result: {
        processed: number;
        marked: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.migrations.backfillListFeeds.markListsBackfilledBatch,
        { cursor: listCursor, batchSize },
      );

      totalListsProcessed += result.processed;
      totalMarked += result.marked;

      if (result.isDone) break;
      if (result.nextCursor === listCursor) {
        console.error("Cursor stalled in markListsBackfilledBatch — aborting");
        break;
      }
      listCursor = result.nextCursor;
    }

    console.log(
      `list feed backfill phase 2: ${totalListsProcessed} lists processed, ${totalMarked} marked backfilled`,
    );
    return null;
  },
});
