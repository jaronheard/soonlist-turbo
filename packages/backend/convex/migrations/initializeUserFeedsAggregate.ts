/**
 * Migration to initialize userFeeds aggregate for existing userFeeds entries
 *
 * Run this once after deploying the aggregate changes to populate the
 * aggregate with existing data.
 */

import { v } from "convex/values";

import { internalMutation } from "../_generated/server";
import { userFeedsAggregate } from "../aggregates";

/**
 * Initialize aggregate for all existing userFeeds entries
 */
export const initializeUserFeedsAggregate = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("Starting userFeeds aggregate initialization...");

    const userFeeds = await ctx.db.query("userFeeds").collect();
    console.log(`Found ${userFeeds.length} userFeeds entries to process`);

    for (const feedEntry of userFeeds) {
      await userFeedsAggregate.insert(ctx, feedEntry);
    }

    console.log("UserFeeds aggregate initialization complete!");
    return null;
  },
});

