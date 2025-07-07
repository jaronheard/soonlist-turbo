import { Migrations } from "@convex-dev/migrations";

import type { DataModel } from "../_generated/dataModel.js";
import { components, internal } from "../_generated/api.js";

export const migrations = new Migrations<DataModel>(components.migrations);

// Migration to add eventEndTime to existing userFeeds entries
export const addEventEndTimeToFeeds = migrations.define({
  table: "userFeeds",
  batchSize: 100, // Process in batches to avoid timeouts
  migrateOne: async (ctx, feedEntry) => {
    try {
      // Skip if already has eventEndTime
      if (
        "eventEndTime" in feedEntry &&
        typeof feedEntry.eventEndTime === "number"
      ) {
        return;
      }

      // Fetch the event to get its endDateTime
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", feedEntry.eventId))
        .first();

      if (!event) {
        console.error(
          `Event ${feedEntry.eventId} not found for feed entry ${feedEntry._id}`,
        );
        // Delete orphaned feed entry
        await ctx.db.delete(feedEntry._id);
        return;
      }

      // Calculate eventEndTime from event's endDateTime
      const eventEndTime = new Date(event.endDateTime).getTime();

      // Update the feed entry with eventEndTime
      await ctx.db.patch(feedEntry._id, {
        eventEndTime,
      });
    } catch (error) {
      console.error(
        `Failed to migrate feed entry ${feedEntry._id} for event ${feedEntry.eventId}:`,
        error,
      );
      throw error;
    }
  },
});

// Runner for the addEventEndTimeToFeeds migration
export const runAddEventEndTimeToFeeds = migrations.runner(
  internal.migrations.addEventEndTimeToFeeds.addEventEndTimeToFeeds,
);
