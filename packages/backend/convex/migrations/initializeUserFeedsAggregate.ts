
import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { userFeedsAggregate } from "../aggregates";

const BATCH_SIZE = 100;

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
    const result = await ctx.db.query("userFeeds").paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor,
    });

    console.log(
      `Processing batch of ${result.page.length} userFeeds entries...`,
    );

    for (const feedEntry of result.page) {
      await userFeedsAggregate.replaceOrInsert(ctx, feedEntry, feedEntry);
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.initializeUserFeedsAggregate
          .initializeUserFeedsAggregateBatch,
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

export const initializeUserFeedsAggregate = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("Starting userFeeds aggregate initialization...");
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.initializeUserFeedsAggregate
        .initializeUserFeedsAggregateBatch,
      { cursor: null },
    );
    return null;
  },
});
