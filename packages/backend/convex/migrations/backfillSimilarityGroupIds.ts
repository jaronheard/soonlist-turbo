import { Migrations } from "@convex-dev/migrations";

import type { DataModel } from "../_generated/dataModel.js";
import { components, internal } from "../_generated/api.js";
import {
  findSimilarityGroupForBackfill,
  generateSimilarityGroupId,
} from "../model/similarityHelpers";

export const migrations = new Migrations<DataModel>(components.migrations);

export const backfillSimilarityGroupIds = migrations.define({
  table: "events",
  batchSize: 50,
  migrateOne: async (ctx, event) => {
    if (event.similarityGroupId) {
      return;
    }

    const similarityGroupId =
      (await findSimilarityGroupForBackfill(ctx, event)) ??
      generateSimilarityGroupId();

    await ctx.db.patch(event._id, { similarityGroupId });
  },
});

export const runBackfillSimilarityGroupIds = migrations.runner(
  internal.migrations.backfillSimilarityGroupIds.backfillSimilarityGroupIds,
);
