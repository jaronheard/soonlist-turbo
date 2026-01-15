import { Migrations } from "@convex-dev/migrations";

import type { DataModel } from "../_generated/dataModel.js";
import { components, internal } from "../_generated/api.js";
import { upsertGroupedFeedEntryFromMembership } from "../feedGroupHelpers";

export const migrations = new Migrations<DataModel>(components.migrations);

export const backfillUserFeedGroups = migrations.define({
  table: "userFeeds",
  batchSize: 200,
  migrateOne: async (ctx, feedEntry) => {
    if (!feedEntry.similarityGroupId) {
      return;
    }

    await upsertGroupedFeedEntryFromMembership(ctx, {
      feedId: feedEntry.feedId,
      similarityGroupId: feedEntry.similarityGroupId,
    });
  },
});

export const runBackfillUserFeedGroups = migrations.runner(
  internal.migrations.backfillUserFeedGroups.backfillUserFeedGroups,
);
