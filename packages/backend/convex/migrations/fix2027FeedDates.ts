import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Migration to fix userFeeds and userFeedGroups entries that have incorrect 2027 timestamps.
 *
 * Strategy: Instead of scanning the entire feeds table, we first find the affected
 * event IDs from the (smaller) events query, then look up their feed entries via
 * the by_event index.
 *
 * Usage:
 * 1. Run dry run first to review changes:
 *    npx convex run migrations/fix2027FeedDates:dryRun --prod
 *
 * 2. After reviewing, run the actual migration:
 *    npx convex run migrations/fix2027FeedDates:migrate --prod
 */

const YEAR_2027_START_MS = new Date("2027-01-01T00:00:00.000Z").getTime();
const YEAR_2028_START_MS = new Date("2028-01-01T00:00:00.000Z").getTime();

/** Find event IDs that were affected by the 2027 bug (already fixed in events table). */
async function getAffectedEventIds(ctx: { db: any }) {
  // Look up events that were recently fixed — they now have 2026 dates,
  // but their feed entries may still have 2027 timestamps.
  // We find events created in March 2026 (when the bug occurred) with dates in the 2026 window.
  // We also check for any events still in 2027 (in case events migration hasn't run).
  const eventsWithFixedDates = await ctx.db
    .query("events")
    .filter((q: any) =>
      q.or(
        // Events still in 2027 (not yet fixed)
        q.and(
          q.gte(q.field("startDateTime"), "2027-01-01"),
          q.lt(q.field("startDateTime"), "2028-01-01"),
        ),
        q.and(
          q.gte(q.field("endDateTime"), "2027-01-01"),
          q.lt(q.field("endDateTime"), "2028-01-01"),
        ),
      ),
    )
    .collect();

  // Also get the events we know were affected (by checking feed entries with 2027 timestamps)
  // But we can't scan feeds. Instead, we'll rely on the event IDs we already know.
  // Return a map of eventId -> correct timestamps
  const eventsMap = new Map<
    string,
    { startDateTime: string; endDateTime: string }
  >();
  for (const event of eventsWithFixedDates) {
    eventsMap.set(event.id, {
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
    });
  }
  return eventsMap;
}

export const dryRun = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // First, find all events that currently have correct dates but whose feed entries
    // might still have 2027 timestamps. We need to check feed entries for ALL events
    // that were part of the 2027 bug. Since events are already fixed, we need another approach:
    // scan feed entries using the by_event index for each known affected event.

    // Get events that still have 2027 dates (if any remain)
    const stillBroken = await getAffectedEventIds(ctx);

    // For events already fixed, we need the list of event IDs.
    // We'll scan feeds by looking for 2027 timestamps in a targeted way:
    // check each feed that has the discover feed prefix.
    // Actually, the simplest approach: query userFeeds by_event for each event we know about.

    // Let's get ALL events and check which ones have feed entries with wrong timestamps.
    // But that's also too many. Instead, let's query the feeds table for entries with 2027 timestamps
    // using a more targeted approach.

    // The feeds are indexed by (feedId, hasEnded, eventStartTime).
    // We can query discover feed entries where hasEnded=false and startTime is in 2027 range.
    const discoverFeedEntries = await ctx.db
      .query("userFeeds")
      .withIndex("by_feed_hasEnded_startTime", (q: any) =>
        q
          .eq("feedId", "discover")
          .eq("hasEnded", false)
          .gte("eventStartTime", YEAR_2027_START_MS),
      )
      .collect();

    const affected2027 = discoverFeedEntries.filter(
      (f: any) => f.eventStartTime < YEAR_2028_START_MS,
    );

    // Also check user-specific feeds with same pattern
    // We'll also check hasEnded=true in case some were incorrectly marked
    const discoverEndedEntries = await ctx.db
      .query("userFeeds")
      .withIndex("by_feed_hasEnded_startTime", (q: any) =>
        q
          .eq("feedId", "discover")
          .eq("hasEnded", true)
          .gte("eventStartTime", YEAR_2027_START_MS),
      )
      .collect();

    const affectedEnded = discoverEndedEntries.filter(
      (f: any) => f.eventStartTime < YEAR_2028_START_MS,
    );

    // Now find ALL feed entries for the affected event IDs using by_event index
    const affectedEventIds = new Set([
      ...affected2027.map((f: any) => f.eventId),
      ...affectedEnded.map((f: any) => f.eventId),
    ]);

    // Get all feed entries for these events across all feeds
    const allAffectedFeedEntries = [];
    for (const eventId of affectedEventIds) {
      const entries = await ctx.db
        .query("userFeeds")
        .withIndex("by_event", (q: any) => q.eq("eventId", eventId))
        .collect();
      for (const entry of entries) {
        if (
          entry.eventStartTime >= YEAR_2027_START_MS &&
          entry.eventStartTime < YEAR_2028_START_MS
        ) {
          allAffectedFeedEntries.push(entry);
        }
      }
    }

    // Look up correct timestamps from events table
    const eventsMap = new Map<
      string,
      { startDateTime: string; endDateTime: string }
    >();
    for (const eventId of affectedEventIds) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q: any) => q.eq("id", eventId))
        .unique();
      if (event) {
        eventsMap.set(eventId, {
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
        });
      }
    }

    // Also check userFeedGroups
    const discoverGroups = await ctx.db
      .query("userFeedGroups")
      .withIndex("by_feed_hasEnded_startTime", (q: any) =>
        q
          .eq("feedId", "discover")
          .eq("hasEnded", false)
          .gte("eventStartTime", YEAR_2027_START_MS),
      )
      .collect();

    const affectedGroups = discoverGroups.filter(
      (g: any) => g.eventStartTime < YEAR_2028_START_MS,
    );

    const feedChanges = allAffectedFeedEntries.map((feed: any) => {
      const event = eventsMap.get(feed.eventId);
      const correctStartTime = event
        ? new Date(event.startDateTime).getTime()
        : null;
      const correctEndTime = event
        ? new Date(event.endDateTime).getTime()
        : null;
      const correctHasEnded = correctEndTime ? correctEndTime < now : null;

      return {
        _id: feed._id,
        feedId: feed.feedId,
        eventId: feed.eventId,
        current: {
          eventStartTime: new Date(feed.eventStartTime).toISOString(),
          eventEndTime: new Date(feed.eventEndTime).toISOString(),
          hasEnded: feed.hasEnded,
        },
        proposed: event
          ? {
              eventStartTime: event.startDateTime,
              eventEndTime: event.endDateTime,
              hasEnded: correctHasEnded,
            }
          : null,
      };
    });

    const groupChanges = affectedGroups.map((group: any) => {
      const event = eventsMap.get(group.primaryEventId);
      const correctStartTime = event
        ? new Date(event.startDateTime).getTime()
        : null;
      const correctEndTime = event
        ? new Date(event.endDateTime).getTime()
        : null;
      const correctHasEnded = correctEndTime ? correctEndTime < now : null;

      return {
        _id: group._id,
        feedId: group.feedId,
        primaryEventId: group.primaryEventId,
        current: {
          eventStartTime: new Date(group.eventStartTime).toISOString(),
          eventEndTime: new Date(group.eventEndTime).toISOString(),
          hasEnded: group.hasEnded,
        },
        proposed: event
          ? {
              eventStartTime: event.startDateTime,
              eventEndTime: event.endDateTime,
              hasEnded: correctHasEnded,
            }
          : null,
      };
    });

    return {
      summary: {
        userFeeds: allAffectedFeedEntries.length,
        userFeedGroups: affectedGroups.length,
        uniqueEvents: affectedEventIds.size,
        eventsStillIn2027: stillBroken.size,
      },
      userFeeds: feedChanges,
      userFeedGroups: groupChanges,
    };
  },
});

export const migrate = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find affected feed entries via discover feed index (avoids full table scan)
    const discoverNotEnded = await ctx.db
      .query("userFeeds")
      .withIndex("by_feed_hasEnded_startTime", (q: any) =>
        q
          .eq("feedId", "discover")
          .eq("hasEnded", false)
          .gte("eventStartTime", YEAR_2027_START_MS),
      )
      .collect();

    const discoverEnded = await ctx.db
      .query("userFeeds")
      .withIndex("by_feed_hasEnded_startTime", (q: any) =>
        q
          .eq("feedId", "discover")
          .eq("hasEnded", true)
          .gte("eventStartTime", YEAR_2027_START_MS),
      )
      .collect();

    const affectedEventIds = new Set([
      ...discoverNotEnded
        .filter((f: any) => f.eventStartTime < YEAR_2028_START_MS)
        .map((f: any) => f.eventId),
      ...discoverEnded
        .filter((f: any) => f.eventStartTime < YEAR_2028_START_MS)
        .map((f: any) => f.eventId),
    ]);

    // Get all feed entries for affected events across ALL feeds (not just discover)
    const allAffectedFeedEntries = [];
    for (const eventId of affectedEventIds) {
      const entries = await ctx.db
        .query("userFeeds")
        .withIndex("by_event", (q: any) => q.eq("eventId", eventId))
        .collect();
      for (const entry of entries) {
        if (
          entry.eventStartTime >= YEAR_2027_START_MS &&
          entry.eventStartTime < YEAR_2028_START_MS
        ) {
          allAffectedFeedEntries.push(entry);
        }
      }
    }

    // Look up correct timestamps from events table
    const eventsMap = new Map<
      string,
      { startDateTime: string; endDateTime: string }
    >();
    for (const eventId of affectedEventIds) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q: any) => q.eq("id", eventId))
        .unique();
      if (event) {
        eventsMap.set(eventId, {
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
        });
      }
    }

    // Fix userFeeds
    let feedsUpdated = 0;
    let feedsSkipped = 0;
    for (const feed of allAffectedFeedEntries) {
      const event = eventsMap.get(feed.eventId);
      if (!event) {
        feedsSkipped++;
        continue;
      }

      const correctStartTime = new Date(event.startDateTime).getTime();
      const correctEndTime = new Date(event.endDateTime).getTime();
      const correctHasEnded = correctEndTime < now;

      await ctx.db.patch(feed._id, {
        eventStartTime: correctStartTime,
        eventEndTime: correctEndTime,
        hasEnded: correctHasEnded,
      });
      feedsUpdated++;
    }

    // Fix userFeedGroups
    const discoverGroups = await ctx.db
      .query("userFeedGroups")
      .withIndex("by_feed_hasEnded_startTime", (q: any) =>
        q
          .eq("feedId", "discover")
          .eq("hasEnded", false)
          .gte("eventStartTime", YEAR_2027_START_MS),
      )
      .collect();

    const affectedGroups = discoverGroups.filter(
      (g: any) => g.eventStartTime < YEAR_2028_START_MS,
    );

    // Also get groups for affected events via the by_group index
    // But we need to find groups by eventId — use primaryEventId lookups
    let groupsUpdated = 0;
    let groupsSkipped = 0;
    for (const group of affectedGroups) {
      const event = eventsMap.get(group.primaryEventId);
      if (!event) {
        groupsSkipped++;
        continue;
      }

      const correctStartTime = new Date(event.startDateTime).getTime();
      const correctEndTime = new Date(event.endDateTime).getTime();
      const correctHasEnded = correctEndTime < now;

      await ctx.db.patch(group._id, {
        eventStartTime: correctStartTime,
        eventEndTime: correctEndTime,
        hasEnded: correctHasEnded,
      });
      groupsUpdated++;
    }

    return {
      mode: "MIGRATED",
      summary: {
        uniqueEvents: affectedEventIds.size,
        feedsUpdated,
        feedsSkipped,
        groupsUpdated,
        groupsSkipped,
      },
    };
  },
});
