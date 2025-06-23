import { v } from "convex/values";

import { internalMutation } from "../_generated/server";

export const populateUserFeeds = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { batchSize = 100 }) => {
    console.log("Starting userFeeds migration...");

    // Get all events
    const events = await ctx.db.query("events").collect();
    console.log(`Found ${events.length} events to process`);

    let processedCount = 0;
    let addedCount = 0;

    // Process events in batches
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);

      for (const event of batch) {
        // Parse the startDateTime to get timestamp
        const eventStartTime = new Date(event.startDateTime).getTime();

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

        processedCount++;

        // Log progress every 100 events
        if (processedCount % 100 === 0) {
          console.log(
            `Processed ${processedCount}/${events.length} events, added ${addedCount} feed entries`,
          );
        }
      }
    }

    console.log(
      `Migration complete! Processed ${processedCount} events, added ${addedCount} feed entries`,
    );

    return {
      processedEvents: processedCount,
      addedFeedEntries: addedCount,
    };
  },
});

// Optional: Clean up orphaned feed entries (events that no longer exist)
export const cleanupOrphanedFeedEntries = internalMutation({
  handler: async (ctx) => {
    console.log("Starting cleanup of orphaned feed entries...");

    const feedEntries = await ctx.db.query("userFeeds").collect();
    let deletedCount = 0;

    for (const entry of feedEntries) {
      // Check if event exists by querying with the custom id
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", entry.eventId))
        .first();

      if (!event) {
        await ctx.db.delete(entry._id);
        deletedCount++;
      }
    }

    console.log(
      `Cleanup complete! Deleted ${deletedCount} orphaned feed entries`,
    );

    return { deletedCount };
  },
});

// Helper to run the migration for a specific user (useful for testing)
export const populateFeedForUser = internalMutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const feedId = `user_${userId}`;
    let addedCount = 0;

    // 1. Get user's own events
    const userEvents = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const event of userEvents) {
      const eventStartTime = new Date(event.startDateTime).getTime();
      const existing = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", feedId).eq("eventId", event.id),
        )
        .first();

      if (!existing) {
        await ctx.db.insert("userFeeds", {
          feedId,
          eventId: event.id,
          eventStartTime,
          addedAt: Date.now(),
        });
        addedCount++;
      }
    }

    // 2. Get events the user follows
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const follow of eventFollows) {
      // Look up event by custom id
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", follow.eventId))
        .first();

      if (!event) continue;

      const eventStartTime = new Date(event.startDateTime).getTime();
      const existing = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", feedId).eq("eventId", follow.eventId),
        )
        .first();

      if (!existing) {
        await ctx.db.insert("userFeeds", {
          feedId,
          eventId: follow.eventId,
          eventStartTime,
          addedAt: Date.now(),
        });
        addedCount++;
      }
    }

    console.log(`Added ${addedCount} events to ${feedId}`);

    return { addedCount };
  },
});
