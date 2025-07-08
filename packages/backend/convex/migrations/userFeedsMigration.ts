import { Migrations } from "@convex-dev/migrations";

import type { DataModel } from "../_generated/dataModel.js";
import { components, internal } from "../_generated/api.js";

export const migrations = new Migrations<DataModel>(components.migrations);

// Migration to populate user feeds from existing events
export const populateUserFeeds = migrations.define({
  table: "events",
  batchSize: 100,
  migrateOne: async (ctx, event) => {
    try {
      const eventStartTime = new Date(event.startDateTime).getTime();
      const eventEndTime = new Date(event.endDateTime).getTime();
      const currentTime = Date.now();
      let addedCount = 0;

      // 1. Add to creator's personal feed
      const creatorFeedId = `user_${event.userId}`;
      try {
        const existingCreatorEntry = await ctx.db
          .query("userFeeds")
          .withIndex("by_feed_event", (q) =>
            q.eq("feedId", creatorFeedId).eq("eventId", event.id),
          )
          .first();

        if (!existingCreatorEntry) {
          await ctx.db.insert("userFeeds", {
            feedId: creatorFeedId,
            eventId: event.id,
            eventStartTime,
            eventEndTime,
            addedAt: currentTime,
            hasEnded: eventEndTime < currentTime, // always set
          });
          addedCount++;
        }
      } catch (error) {
        console.error(
          `Failed to add event ${event.id} to creator feed ${creatorFeedId}:`,
          error,
        );
        throw error;
      }

      // 2. Add to discover feed if public
      if (event.visibility === "public") {
        const discoverFeedId = "discover";
        try {
          const existingDiscoverEntry = await ctx.db
            .query("userFeeds")
            .withIndex("by_feed_event", (q) =>
              q.eq("feedId", discoverFeedId).eq("eventId", event.id),
            )
            .first();

          if (!existingDiscoverEntry) {
            await ctx.db.insert("userFeeds", {
              feedId: discoverFeedId,
              eventId: event.id,
              eventStartTime,
              eventEndTime,
              addedAt: currentTime,
              hasEnded: eventEndTime < currentTime, // always set
            });
            addedCount++;
          }
        } catch (error) {
          console.error(
            `Failed to add event ${event.id} to discover feed:`,
            error,
          );
          throw error;
        }
      }

      // 3. Add to feeds of users who follow this event
      try {
        const eventFollows = await ctx.db
          .query("eventFollows")
          .withIndex("by_event", (q) => q.eq("eventId", event.id))
          .collect();

        for (const follow of eventFollows) {
          const followerFeedId = `user_${follow.userId}`;
          try {
            const existingFollowerEntry = await ctx.db
              .query("userFeeds")
              .withIndex("by_feed_event", (q) =>
                q.eq("feedId", followerFeedId).eq("eventId", event.id),
              )
              .first();

            if (!existingFollowerEntry) {
              await ctx.db.insert("userFeeds", {
                feedId: followerFeedId,
                eventId: event.id,
                eventStartTime,
                eventEndTime,
                addedAt: currentTime,
                hasEnded: eventEndTime < currentTime, // always set
              });
              addedCount++;
            }
          } catch (error) {
            console.error(
              `Failed to add event ${event.id} to follower feed ${followerFeedId}:`,
              error,
            );
            // Continue with other followers rather than failing the entire migration
            continue;
          }
        }
      } catch (error) {
        console.error(
          `Failed to fetch event follows for event ${event.id}:`,
          error,
        );
        throw error;
      }

      console.log(
        `Processed event ${event.id}, added ${addedCount} feed entries`,
      );
    } catch (error) {
      console.error(`Failed to process event ${event.id} in migration:`, error);
      throw error;
    }
  },
});

// Specific runner for the populateUserFeeds migration
export const runPopulateUserFeeds = migrations.runner(
  internal.migrations.userFeedsMigration.populateUserFeeds,
);

// Optional: cleanup migration for orphaned entries
export const cleanupOrphanedFeedEntries = migrations.define({
  table: "userFeeds",
  batchSize: 50,
  migrateOne: async (ctx, feedEntry) => {
    try {
      // Check if event exists by querying with the custom id
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", feedEntry.eventId))
        .first();

      if (!event) {
        console.log(
          `Deleting orphaned feed entry for event ${feedEntry.eventId}`,
        );
        try {
          await ctx.db.delete(feedEntry._id);
        } catch (error) {
          console.error(
            `Failed to delete orphaned feed entry ${feedEntry._id} for event ${feedEntry.eventId}:`,
            error,
          );
          throw error;
        }
      }
    } catch (error) {
      console.error(
        `Failed to process feed entry ${feedEntry._id} in cleanup migration:`,
        error,
      );
      throw error;
    }
  },
});

export const runCleanupOrphanedFeedEntries = migrations.runner(
  internal.migrations.userFeedsMigration.cleanupOrphanedFeedEntries,
);

// Remove or comment out the populateHasEndedField migration as hasEnded is now required
// export const populateHasEndedField = migrations.define({
//   table: "userFeeds",
//   batchSize: 100, // Can process more entries since we're just updating a field
//   migrateOne: async (ctx, feedEntry) => {
//     try {
//       // Skip if hasEnded is already set (handles re-runs)
//       if ("hasEnded" in feedEntry && feedEntry.hasEnded !== undefined) {
//         return;
//       }

//       const eventEndTime = feedEntry.eventEndTime;
//       const hasEnded = eventEndTime < Date.now();

//       await ctx.db.patch(feedEntry._id, {
//         hasEnded,
//       });

//       console.log(
//         `Updated feed entry ${feedEntry._id} for event ${feedEntry.eventId}: hasEnded=${hasEnded}`,
//       );
//     } catch (error) {
//       console.error(
//         `Failed to update hasEnded for feed entry ${feedEntry._id}:`,
//         error,
//       );
//       throw error;
//     }
//   },
// });

// export const runPopulateHasEndedField = migrations.runner(
//   internal.migrations.userFeedsMigration.populateHasEndedField,
// );
