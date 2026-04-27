/**
 * Migration to initialize userFeedGroups aggregate for existing entries.
 *
 * Run this once after deploying the aggregate changes (and after any clears
 * via components.userFeedGroupsAggregate.public.clear) to populate the
 * aggregate with existing data.
 *
 * Mirrors initializeUserFeedsAggregate.ts; same self-scheduling pagination
 * pattern.
 */

import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { userFeedGroupsAggregate } from "../aggregates";

const BATCH_SIZE = 100;

/**
 * Initialize aggregate for a batch of userFeedGroups entries
 */
export const initializeUserFeedGroupsAggregateBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({
    isDone: v.boolean(),
    cursor: v.union(v.string(), v.null()),
    processedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db.query("userFeedGroups").paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor,
    });

    console.log(
      `Processing batch of ${result.page.length} userFeedGroups entries...`,
    );

    for (const entry of result.page) {
      await userFeedGroupsAggregate.replaceOrInsert(ctx, entry, entry);
    }

    // If there are more pages, schedule the next batch
    if (!result.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.initializeUserFeedGroupsAggregate
          .initializeUserFeedGroupsAggregateBatch,
        { cursor: result.continueCursor },
      );
    }

    return {
      isDone: result.isDone,
      cursor: result.continueCursor,
      processedCount: result.page.length,
    };
  },
});

/**
 * Initialize aggregate for all existing userFeedGroups entries (orchestrator)
 */
export const initializeUserFeedGroupsAggregate = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("Starting userFeedGroups aggregate initialization...");
    // Kick off the first batch; subsequent batches self-schedule
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.initializeUserFeedGroupsAggregate
        .initializeUserFeedGroupsAggregateBatch,
      { cursor: null },
    );
    return null;
  },
});
