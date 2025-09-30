/**
 * Migration to initialize userFeeds aggregate for existing userFeeds entries
 *
 * Run this once after deploying the aggregate changes to populate the
 * aggregate with existing data.
 */

import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { userFeedsAggregate } from "../aggregates";

const BATCH_SIZE = 100;

/**
 * Initialize aggregate for a batch of userFeeds entries
 */
export const initializeUserFeedsAggregateBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({
    isDone: v.boolean(),
    cursor: v.union(v.string(), v.null()),
    processedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const clearedNamespaces = new Set<string>();
    const result = await ctx.db.query("userFeeds").paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor,
    });

    console.log(
      `Processing batch of ${result.page.length} userFeeds entries...`,
    );

    for (const feedEntry of result.page) {
      if (!clearedNamespaces.has(feedEntry.feedId)) {
        await userFeedsAggregate.clear(ctx, { namespace: feedEntry.feedId });
        clearedNamespaces.add(feedEntry.feedId);
      }
      await userFeedsAggregate.replaceOrInsert(ctx, feedEntry, feedEntry);
    }

    return {
      isDone: result.isDone,
      cursor: result.continueCursor,
      processedCount: result.page.length,
    };
  },
});

/**
 * Initialize aggregate for all existing userFeeds entries (orchestrator)
 */
export const initializeUserFeedsAggregate = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("Starting userFeeds aggregate initialization...");

    // Note: We clear per-namespace inside the batch to avoid requiring a full scan of namespaces

    let cursor: string | null = null;
    let totalProcessed = 0;
    let batchNumber = 0;
    let done = false;

    while (!done) {
      const result: {
        isDone: boolean;
        cursor: string | null;
        processedCount: number;
      } = await ctx.runMutation(
        internal.migrations.initializeUserFeedsAggregate
          .initializeUserFeedsAggregateBatch,
        { cursor },
      );

      batchNumber++;
      totalProcessed += result.processedCount;
      cursor = result.cursor;

      console.log(
        `Completed batch ${batchNumber}, processed ${totalProcessed} userFeeds entries total`,
      );

      if (result.isDone) {
        console.log(
          `UserFeeds aggregate initialization complete! Processed ${totalProcessed} total userFeeds entries`,
        );
        done = true;
        break;
      }

      // Schedule next batch
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.initializeUserFeedsAggregate
          .initializeUserFeedsAggregateBatch,
        { cursor },
      );

      // Exit this mutation and let the scheduled one continue
      return null;
    }

    return null;
  },
});
