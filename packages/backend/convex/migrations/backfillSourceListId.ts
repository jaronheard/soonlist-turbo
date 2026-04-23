import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";

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
    const followedListsByUser = new Map<string, Set<string>>();

    for (const entry of result.page) {
      if (!entry.feedId.startsWith("followedLists_") || entry.sourceListId) {
        continue;
      }

      const userId = entry.feedId.replace("followedLists_", "");

      let followedListIds = followedListsByUser.get(userId);
      if (!followedListIds) {
        const userListFollows = await ctx.db
          .query("listFollows")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();
        followedListIds = new Set(userListFollows.map((f) => f.listId));
        followedListsByUser.set(userId, followedListIds);
      }

      if (followedListIds.size === 0) {
        continue;
      }

      let matchingListId: string | undefined = undefined;
      for (const listId of followedListIds) {
        const etl = await ctx.db
          .query("eventToLists")
          .withIndex("by_event_and_list", (q) =>
            q.eq("eventId", entry.eventId).eq("listId", listId),
          )
          .first();
        if (etl) {
          matchingListId = listId;
          break;
        }
      }

      if (matchingListId) {
        await ctx.db.patch(entry._id, {
          sourceListId: matchingListId,
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

export const runBackfillSourceListId = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    let totalProcessed = 0;
    let totalUpdated = 0;
    let cursor: string | null = null;
    const batchSize = 50;

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
