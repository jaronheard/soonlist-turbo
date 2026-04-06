import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { listFollowsAggregate } from "../aggregates";
import { getOrCreatePersonalList } from "../lists";

/**
 * Batch mutation: convert userFollows to listFollows by following the target user's personal list
 */
export const userFollowsToListFollowsBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    migrated: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const result = await ctx.db
      .query("userFollows")
      .paginate({ numItems: batchSize, cursor });

    let migrated = 0;

    for (const userFollow of result.page) {
      // Get or create the followed user's personal list
      const personalList = await getOrCreatePersonalList(
        ctx,
        userFollow.followingId,
      );

      // Check if listFollow already exists
      const existingListFollow = await ctx.db
        .query("listFollows")
        .withIndex("by_user_and_list", (q) =>
          q.eq("userId", userFollow.followerId).eq("listId", personalList.id),
        )
        .first();

      if (!existingListFollow) {
        const followId = await ctx.db.insert("listFollows", {
          userId: userFollow.followerId,
          listId: personalList.id,
        });
        const followDoc = (await ctx.db.get(followId))!;
        await listFollowsAggregate.insert(ctx, followDoc);

        // Schedule feed population
        await ctx.scheduler.runAfter(
          0,
          internal.feedHelpers.addListEventsToUserFeed,
          {
            userId: userFollow.followerId,
            listId: personalList.id,
          },
        );

        migrated++;
      }
    }

    return {
      processed: result.page.length,
      migrated,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * Action: orchestrate migration of userFollows → listFollows
 */
export const runUserFollowsToListFollows = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    let totalProcessed = 0;
    let totalMigrated = 0;
    let cursor: string | null = null;
    const batchSize = 50;

    while (true) {
      const result: {
        processed: number;
        migrated: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.migrations.userFollowsToListFollows
          .userFollowsToListFollowsBatch,
        { cursor, batchSize },
      );

      totalProcessed += result.processed;
      totalMigrated += result.migrated;

      if (result.isDone) break;
      if (result.nextCursor === cursor) {
        console.error("Cursor stalled in userFollowsToListFollows — aborting");
        break;
      }
      cursor = result.nextCursor;
    }

    console.log(
      `userFollows→listFollows migration: ${totalProcessed} processed, ${totalMigrated} migrated`,
    );
    return null;
  },
});
