import { Migrations } from "@convex-dev/migrations";

import type { DataModel } from "../_generated/dataModel.js";
import { components, internal } from "../_generated/api.js";
import { userFeedsAggregate } from "../aggregates.js";

export const migrations = new Migrations<DataModel>(components.migrations);

/**
 * Backfill eventVisibility in userFeeds table
 * Copies the visibility from the event to each userFeeds entry
 */
export const backfillUserFeedVisibility = migrations.define({
  table: "userFeeds",
  batchSize: 100,
  migrateOne: async (ctx, feedEntry) => {
    // Skip if already has eventVisibility
    if (feedEntry.eventVisibility) {
      return;
    }

    try {
      // Get the event to fetch its visibility
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", feedEntry.eventId))
        .first();

      if (!event) {
        console.log(
          `Event ${feedEntry.eventId} not found for feed entry ${feedEntry._id}`,
        );
        return;
      }

      const oldDoc = feedEntry;
      await ctx.db.patch(feedEntry._id, {
        eventVisibility: event.visibility,
      });
      const updatedDoc = (await ctx.db.get(feedEntry._id))!;
      await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);

      console.log(
        `Set eventVisibility=${event.visibility} for feed entry ${feedEntry._id}`,
      );
    } catch (error) {
      console.error(
        `Failed to set eventVisibility for feed entry ${feedEntry._id}:`,
        error,
      );
      throw error;
    }
  },
});

export const runBackfillUserFeedVisibility = migrations.runner(
  internal.migrations.backfillUserFeedVisibility.backfillUserFeedVisibility,
);
