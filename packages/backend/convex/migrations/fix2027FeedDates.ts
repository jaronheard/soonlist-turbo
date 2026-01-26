import { v } from "convex/values";

import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Migration to fix userFeeds and userFeedGroups entries that have incorrect 2027 timestamps.
 *
 * The events table has already been fixed, but the feed tables still have wrong timestamps.
 * This migration looks up the correct values from the events table and updates the feeds.
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

export const dryRun = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all userFeeds entries with eventStartTime in 2027
    const allUserFeeds = await ctx.db.query("userFeeds").collect();
    const affectedUserFeeds = allUserFeeds.filter(
      (f) =>
        f.eventStartTime >= YEAR_2027_START_MS &&
        f.eventStartTime < YEAR_2028_START_MS
    );

    // Find all userFeedGroups entries with eventStartTime in 2027
    const allUserFeedGroups = await ctx.db.query("userFeedGroups").collect();
    const affectedUserFeedGroups = allUserFeedGroups.filter(
      (f) =>
        f.eventStartTime >= YEAR_2027_START_MS &&
        f.eventStartTime < YEAR_2028_START_MS
    );

    // Build a map of event IDs to their correct timestamps
    const eventIds = new Set([
      ...affectedUserFeeds.map((f) => f.eventId),
      ...affectedUserFeedGroups.map((f) => f.primaryEventId),
    ]);

    const eventsMap = new Map<
      string,
      { startDateTime: string; endDateTime: string }
    >();
    for (const eventId of eventIds) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", eventId))
        .unique();
      if (event) {
        eventsMap.set(eventId, {
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
        });
      }
    }

    // Calculate proposed changes for userFeeds
    const userFeedsChanges = affectedUserFeeds.map((feed) => {
      const event = eventsMap.get(feed.eventId);
      if (!event) {
        return {
          _id: feed._id,
          feedId: feed.feedId,
          eventId: feed.eventId,
          error: "Event not found in events table",
          current: {
            eventStartTime: new Date(feed.eventStartTime).toISOString(),
            eventEndTime: new Date(feed.eventEndTime).toISOString(),
            hasEnded: feed.hasEnded,
          },
          proposed: null,
        };
      }

      const correctStartTime = new Date(event.startDateTime).getTime();
      const correctEndTime = new Date(event.endDateTime).getTime();
      const correctHasEnded = correctEndTime < now;

      return {
        _id: feed._id,
        feedId: feed.feedId,
        eventId: feed.eventId,
        current: {
          eventStartTime: new Date(feed.eventStartTime).toISOString(),
          eventEndTime: new Date(feed.eventEndTime).toISOString(),
          hasEnded: feed.hasEnded,
        },
        proposed: {
          eventStartTime: event.startDateTime,
          eventEndTime: event.endDateTime,
          hasEnded: correctHasEnded,
        },
        changes: {
          startTimeChanged: feed.eventStartTime !== correctStartTime,
          endTimeChanged: feed.eventEndTime !== correctEndTime,
          hasEndedChanged: feed.hasEnded !== correctHasEnded,
        },
      };
    });

    // Calculate proposed changes for userFeedGroups
    const userFeedGroupsChanges = affectedUserFeedGroups.map((group) => {
      const event = eventsMap.get(group.primaryEventId);
      if (!event) {
        return {
          _id: group._id,
          feedId: group.feedId,
          primaryEventId: group.primaryEventId,
          error: "Event not found in events table",
          current: {
            eventStartTime: new Date(group.eventStartTime).toISOString(),
            eventEndTime: new Date(group.eventEndTime).toISOString(),
            hasEnded: group.hasEnded,
          },
          proposed: null,
        };
      }

      const correctStartTime = new Date(event.startDateTime).getTime();
      const correctEndTime = new Date(event.endDateTime).getTime();
      const correctHasEnded = correctEndTime < now;

      return {
        _id: group._id,
        feedId: group.feedId,
        primaryEventId: group.primaryEventId,
        current: {
          eventStartTime: new Date(group.eventStartTime).toISOString(),
          eventEndTime: new Date(group.eventEndTime).toISOString(),
          hasEnded: group.hasEnded,
        },
        proposed: {
          eventStartTime: event.startDateTime,
          eventEndTime: event.endDateTime,
          hasEnded: correctHasEnded,
        },
        changes: {
          startTimeChanged: group.eventStartTime !== correctStartTime,
          endTimeChanged: group.eventEndTime !== correctEndTime,
          hasEndedChanged: group.hasEnded !== correctHasEnded,
        },
      };
    });

    return {
      summary: {
        userFeeds: {
          total: affectedUserFeeds.length,
          withErrors: userFeedsChanges.filter((c) => c.proposed === null).length,
        },
        userFeedGroups: {
          total: affectedUserFeedGroups.length,
          withErrors: userFeedGroupsChanges.filter((c) => c.proposed === null)
            .length,
        },
        uniqueEvents: eventIds.size,
        eventsFound: eventsMap.size,
      },
      userFeeds: userFeedsChanges,
      userFeedGroups: userFeedGroupsChanges,
    };
  },
});

export const migrate = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const isDryRun = args.dryRun ?? false;
    const now = Date.now();

    // Find all userFeeds entries with eventStartTime in 2027
    const allUserFeeds = await ctx.db.query("userFeeds").collect();
    const affectedUserFeeds = allUserFeeds.filter(
      (f) =>
        f.eventStartTime >= YEAR_2027_START_MS &&
        f.eventStartTime < YEAR_2028_START_MS
    );

    // Find all userFeedGroups entries with eventStartTime in 2027
    const allUserFeedGroups = await ctx.db.query("userFeedGroups").collect();
    const affectedUserFeedGroups = allUserFeedGroups.filter(
      (f) =>
        f.eventStartTime >= YEAR_2027_START_MS &&
        f.eventStartTime < YEAR_2028_START_MS
    );

    // Build a map of event IDs to their correct timestamps
    const eventIds = new Set([
      ...affectedUserFeeds.map((f) => f.eventId),
      ...affectedUserFeedGroups.map((f) => f.primaryEventId),
    ]);

    const eventsMap = new Map<
      string,
      { startDateTime: string; endDateTime: string }
    >();
    for (const eventId of eventIds) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", eventId))
        .unique();
      if (event) {
        eventsMap.set(eventId, {
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
        });
      }
    }

    const results = {
      userFeeds: [] as Array<{
        _id: string;
        eventId: string;
        status: string;
        changes?: Record<string, unknown>;
      }>,
      userFeedGroups: [] as Array<{
        _id: string;
        primaryEventId: string;
        status: string;
        changes?: Record<string, unknown>;
      }>,
    };

    // Fix userFeeds
    for (const feed of affectedUserFeeds) {
      const event = eventsMap.get(feed.eventId);
      if (!event) {
        results.userFeeds.push({
          _id: feed._id,
          eventId: feed.eventId,
          status: "SKIPPED - event not found",
        });
        continue;
      }

      const correctStartTime = new Date(event.startDateTime).getTime();
      const correctEndTime = new Date(event.endDateTime).getTime();
      const correctHasEnded = correctEndTime < now;

      const changes: Record<string, unknown> = {};
      if (feed.eventStartTime !== correctStartTime) {
        changes.eventStartTime = correctStartTime;
      }
      if (feed.eventEndTime !== correctEndTime) {
        changes.eventEndTime = correctEndTime;
      }
      if (feed.hasEnded !== correctHasEnded) {
        changes.hasEnded = correctHasEnded;
      }

      if (Object.keys(changes).length > 0 && !isDryRun) {
        await ctx.db.patch(feed._id, changes);
      }

      results.userFeeds.push({
        _id: feed._id,
        eventId: feed.eventId,
        status: isDryRun ? "WOULD UPDATE" : "UPDATED",
        changes,
      });
    }

    // Fix userFeedGroups
    for (const group of affectedUserFeedGroups) {
      const event = eventsMap.get(group.primaryEventId);
      if (!event) {
        results.userFeedGroups.push({
          _id: group._id,
          primaryEventId: group.primaryEventId,
          status: "SKIPPED - event not found",
        });
        continue;
      }

      const correctStartTime = new Date(event.startDateTime).getTime();
      const correctEndTime = new Date(event.endDateTime).getTime();
      const correctHasEnded = correctEndTime < now;

      const changes: Record<string, unknown> = {};
      if (group.eventStartTime !== correctStartTime) {
        changes.eventStartTime = correctStartTime;
      }
      if (group.eventEndTime !== correctEndTime) {
        changes.eventEndTime = correctEndTime;
      }
      if (group.hasEnded !== correctHasEnded) {
        changes.hasEnded = correctHasEnded;
      }

      if (Object.keys(changes).length > 0 && !isDryRun) {
        await ctx.db.patch(group._id, changes);
      }

      results.userFeedGroups.push({
        _id: group._id,
        primaryEventId: group.primaryEventId,
        status: isDryRun ? "WOULD UPDATE" : "UPDATED",
        changes,
      });
    }

    return {
      mode: isDryRun ? "DRY RUN" : "MIGRATED",
      summary: {
        userFeedsUpdated: results.userFeeds.filter(
          (r) => r.status === "UPDATED" || r.status === "WOULD UPDATE"
        ).length,
        userFeedsSkipped: results.userFeeds.filter((r) =>
          r.status.includes("SKIPPED")
        ).length,
        userFeedGroupsUpdated: results.userFeedGroups.filter(
          (r) => r.status === "UPDATED" || r.status === "WOULD UPDATE"
        ).length,
        userFeedGroupsSkipped: results.userFeedGroups.filter((r) =>
          r.status.includes("SKIPPED")
        ).length,
      },
      results,
    };
  },
});
