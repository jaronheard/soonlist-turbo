import { Migrations } from "@convex-dev/migrations";

import type { DataModel } from "../_generated/dataModel.js";
import { components } from "../_generated/api.js";

export const migrations = new Migrations<DataModel>(components.migrations);

// Migration to populate user feeds from existing events
export const populateUserFeeds = migrations.define({
  table: "events",
  batchSize: 10, // Small batch size to avoid read limits
  migrateOne: async (ctx, event) => {
    const eventStartTime = new Date(event.startDateTime).getTime();
    let addedCount = 0;

    // 1. Add to creator's personal feed
    const creatorFeedId = `user_${event.userId}`;
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
        addedAt: Date.now(),
      });
      addedCount++;
    }

    // 2. Add to discover feed if public
    if (event.visibility === "public") {
      const discoverFeedId = "discover";
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
          addedAt: Date.now(),
        });
        addedCount++;
      }
    }

    // 3. Add to feeds of users who follow this event
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_event", (q) => q.eq("eventId", event.id))
      .collect();

    for (const follow of eventFollows) {
      const followerFeedId = `user_${follow.userId}`;
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
          addedAt: Date.now(),
        });
        addedCount++;
      }
    }

    console.log(
      `Processed event ${event.id}, added ${addedCount} feed entries`,
    );
  },
});

// Runner function for the migration
export const runPopulateUserFeeds = migrations.runner();

// Optional: cleanup migration for orphaned entries
export const cleanupOrphanedFeedEntries = migrations.define({
  table: "userFeeds",
  batchSize: 50,
  migrateOne: async (ctx, feedEntry) => {
    // Check if event exists by querying with the custom id
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", feedEntry.eventId))
      .first();

    if (!event) {
      console.log(
        `Deleting orphaned feed entry for event ${feedEntry.eventId}`,
      );
      await ctx.db.delete(feedEntry._id);
    }
  },
});

export const runCleanupOrphanedFeedEntries = migrations.runner();
