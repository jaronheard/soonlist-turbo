import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { addEventToListFeedInline } from "../feedHelpers";

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
        throw new Error(
          `Cursor stalled in backfillListFeeds after ${totalProcessed} rows — phase 2 not run`,
        );
      }
      cursor = result.nextCursor;
    }

    console.log(
      `list feed backfill phase 1: ${totalProcessed} eventToLists processed, ${totalUpserted} feed entries upserted, ${totalSkipped} skipped (missing event)`,
    );

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
