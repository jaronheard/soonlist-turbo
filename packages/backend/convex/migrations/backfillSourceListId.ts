import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";

/**
 * Batch mutation: backfill sourceListId for followedLists_ feed entries that lack it
 */
export const backfillSourceListIdBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    updated: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const result = await ctx.db
      .query("userFeeds")
      .paginate({ numItems: batchSize, cursor });

    let updated = 0;

    for (const entry of result.page) {
      // Only process followedLists_ entries that lack sourceListId
      if (!entry.feedId.startsWith("followedLists_") || entry.sourceListId) {
        continue;
      }

      // Extract userId from feedId
      const userId = entry.feedId.replace("followedLists_", "");

      // Find the event's lists
      const eventToLists = await ctx.db
        .query("eventToLists")
        .withIndex("by_event", (q) => q.eq("eventId", entry.eventId))
        .collect();

      // Find which of those lists the user follows
      const userListFollows = await ctx.db
        .query("listFollows")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      const followedListIds = new Set(userListFollows.map((f) => f.listId));

      // Find the first matching list
      const matchingEtl = eventToLists.find((etl) =>
        followedListIds.has(etl.listId),
      );

      if (matchingEtl) {
        await ctx.db.patch(entry._id, {
          sourceListId: matchingEtl.listId,
        });
        updated++;
      }
    }

    return {
      processed: result.page.length,
      updated,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * Action: orchestrate backfill of sourceListId
 */
export const runBackfillSourceListId = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    let totalProcessed = 0;
    let totalUpdated = 0;
    let cursor: string | null = null;
    const batchSize = 200;

    while (true) {
      const result: {
        processed: number;
        updated: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.migrations.backfillSourceListId.backfillSourceListIdBatch,
        { cursor, batchSize },
      );

      totalProcessed += result.processed;
      totalUpdated += result.updated;

      if (result.isDone) break;
      if (result.nextCursor === cursor) {
        console.error("Cursor stalled in backfillSourceListId — aborting");
        break;
      }
      cursor = result.nextCursor;
    }

    console.log(
      `sourceListId backfill: ${totalProcessed} processed, ${totalUpdated} updated`,
    );
    return null;
  },
});
