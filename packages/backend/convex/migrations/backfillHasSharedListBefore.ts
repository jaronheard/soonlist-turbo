import { Migrations } from "@convex-dev/migrations";

import type { DataModel } from "../_generated/dataModel.js";
import { components, internal } from "../_generated/api.js";

export const migrations = new Migrations<DataModel>(components.migrations);

/**
 * Any user who already had publicListEnabled === true at the time of this
 * deploy effectively "shared before" under the old buried-settings model.
 * Set their hasSharedListBefore to true so the new first-share sheet
 * doesn't re-interrogate them.
 *
 * Users with publicListEnabled false/unset are left alone — they'll see
 * the sheet on their next share attempt.
 */
export const backfillHasSharedListBefore = migrations.define({
  table: "users",
  batchSize: 200,
  migrateOne: async (ctx, user) => {
    if (user.hasSharedListBefore === true) return;
    if (user.publicListEnabled !== true) return;

    await ctx.db.patch(user._id, { hasSharedListBefore: true });
  },
});

export const runBackfillHasSharedListBefore = migrations.runner(
  internal.migrations.backfillHasSharedListBefore.backfillHasSharedListBefore,
);
