import { Migrations } from "@convex-dev/migrations";

import type { DataModel } from "../_generated/dataModel.js";
import { components, internal } from "../_generated/api.js";

export const migrations = new Migrations<DataModel>(components.migrations);

export const backfillUserFeedSimilarityGroupIds = migrations.define({
  table: "userFeeds",
  batchSize: 200,
  migrateOne: async (ctx, feedEntry) => {
    if (feedEntry.similarityGroupId) {
      return;
    }

    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", feedEntry.eventId))
      .unique();

    if (!event?.similarityGroupId) {
      return;
    }

    await ctx.db.patch(feedEntry._id, {
      similarityGroupId: event.similarityGroupId,
    });
  },
});

export const runBackfillUserFeedSimilarityGroupIds = migrations.runner(
  internal.migrations.backfillUserFeedSimilarityGroupIds
    .backfillUserFeedSimilarityGroupIds,
);
