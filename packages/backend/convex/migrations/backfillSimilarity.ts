import { Migrations } from "@convex-dev/migrations";

import type { DataModel } from "../_generated/dataModel.js";
import { components, internal } from "../_generated/api.js";
import { findSimilarEventForBackfill } from "../model/similarityHelpers.js";

export const migrations = new Migrations<DataModel>(components.migrations);

/**
 * Migration to backfill similarToEventId for existing events.
 *
 * This migration processes events in order of creation (oldest first) so that
 * canonical events are established before their duplicates are processed.
 *
 * Run with: npx convex run migrations/backfillSimilarity:runBackfillSimilarity
 */
export const backfillSimilarity = migrations.define({
  table: "events",
  batchSize: 50, // Smaller batch size since similarity computation is expensive
  migrateOne: async (ctx, event) => {
    try {
      // Skip if already has similarToEventId set
      if (event.similarToEventId !== undefined) {
        return;
      }

      // Find similar events that were created before this one
      const similarToEventId = await findSimilarEventForBackfill(ctx, event);

      if (similarToEventId) {
        await ctx.db.patch(event._id, {
          similarToEventId,
        });
        console.log(
          `Event ${event.id} linked to canonical event ${similarToEventId}`,
        );
      }
    } catch (error) {
      console.error(
        `Failed to process event ${event.id} in similarity backfill:`,
        error,
      );
      throw error;
    }
  },
});

// Runner for the backfill migration
export const runBackfillSimilarity = migrations.runner(
  internal.migrations.backfillSimilarity.backfillSimilarity,
);
