import { v } from "convex/values";

import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { userFeedsAggregate } from "../aggregates";

/**
 * Migration to fix userFeeds and userFeedGroups entries that have incorrect 2027 timestamps.
 *
 * The events table has already been fixed, but the feed tables still have wrong timestamps.
 * This migration uses cursor-based pagination to avoid the 32k document scan limit.
 *
 * Usage:
 * 1. Run dry run first to review changes:
 *    npx convex run migrations/fix2027FeedDates:dryRunFix2027FeedDates --prod
 *
 * 2. After reviewing, run the actual migration:
 *    npx convex run migrations/fix2027FeedDates:fix2027FeedDates --prod
 */

const YEAR_2027_START_MS = new Date("2027-01-01T00:00:00.000Z").getTime();
const YEAR_2028_START_MS = new Date("2028-01-01T00:00:00.000Z").getTime();

function isIn2027(timestamp: number): boolean {
  return timestamp >= YEAR_2027_START_MS && timestamp < YEAR_2028_START_MS;
}

// --- Batched mutations ---

export const migrateFeedsBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    updated: v.number(),
    skipped: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const now = Date.now();
    let updated = 0;
    let skipped = 0;

    const result = await ctx.db
      .query("userFeeds")
      .order("asc")
      .paginate({ numItems: batchSize, cursor });

    for (const entry of result.page) {
      if (!isIn2027(entry.eventStartTime)) continue;

      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", entry.eventId))
        .first();

      if (!event) {
        skipped++;
        continue;
      }

      const correctStartTime = new Date(event.startDateTime).getTime();
      const correctEndTime = new Date(event.endDateTime).getTime();
      const correctHasEnded = correctEndTime < now;

      const changes: Record<string, unknown> = {};
      if (entry.eventStartTime !== correctStartTime)
        changes.eventStartTime = correctStartTime;
      if (entry.eventEndTime !== correctEndTime)
        changes.eventEndTime = correctEndTime;
      if (entry.hasEnded !== correctHasEnded)
        changes.hasEnded = correctHasEnded;

      if (Object.keys(changes).length > 0) {
        const oldDoc = entry;
        const updatedDoc = { ...oldDoc, ...changes };
        await ctx.db.patch(entry._id, changes);
        if ("hasEnded" in changes) {
          await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);
        }
        updated++;
      }
    }

    return {
      processed: result.page.length,
      updated,
      skipped,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const migrateGroupsBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    updated: v.number(),
    skipped: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const now = Date.now();
    let updated = 0;
    let skipped = 0;

    const result = await ctx.db
      .query("userFeedGroups")
      .order("asc")
      .paginate({ numItems: batchSize, cursor });

    for (const entry of result.page) {
      if (!isIn2027(entry.eventStartTime)) continue;

      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", entry.primaryEventId))
        .first();

      if (!event) {
        skipped++;
        continue;
      }

      const correctStartTime = new Date(event.startDateTime).getTime();
      const correctEndTime = new Date(event.endDateTime).getTime();
      const correctHasEnded = correctEndTime < now;

      const changes: Record<string, unknown> = {};
      if (entry.eventStartTime !== correctStartTime)
        changes.eventStartTime = correctStartTime;
      if (entry.eventEndTime !== correctEndTime)
        changes.eventEndTime = correctEndTime;
      if (entry.hasEnded !== correctHasEnded)
        changes.hasEnded = correctHasEnded;

      if (Object.keys(changes).length > 0) {
        await ctx.db.patch(entry._id, changes);
        updated++;
      }
    }

    return {
      processed: result.page.length,
      updated,
      skipped,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

// --- Batched queries (dry run) ---

export const dryRunFeedsBatch = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    affected: v.number(),
    skipped: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const now = Date.now();
    let affected = 0;
    let skipped = 0;

    const result = await ctx.db
      .query("userFeeds")
      .order("asc")
      .paginate({ numItems: batchSize, cursor });

    for (const entry of result.page) {
      if (!isIn2027(entry.eventStartTime)) continue;

      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", entry.eventId))
        .first();

      if (!event) {
        skipped++;
        continue;
      }

      const correctStartTime = new Date(event.startDateTime).getTime();
      const correctEndTime = new Date(event.endDateTime).getTime();
      const correctHasEnded = correctEndTime < now;

      if (
        entry.eventStartTime !== correctStartTime ||
        entry.eventEndTime !== correctEndTime ||
        entry.hasEnded !== correctHasEnded
      ) {
        affected++;
      }
    }

    return {
      processed: result.page.length,
      affected,
      skipped,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const dryRunGroupsBatch = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    affected: v.number(),
    skipped: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const now = Date.now();
    let affected = 0;
    let skipped = 0;

    const result = await ctx.db
      .query("userFeedGroups")
      .order("asc")
      .paginate({ numItems: batchSize, cursor });

    for (const entry of result.page) {
      if (!isIn2027(entry.eventStartTime)) continue;

      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", entry.primaryEventId))
        .first();

      if (!event) {
        skipped++;
        continue;
      }

      const correctStartTime = new Date(event.startDateTime).getTime();
      const correctEndTime = new Date(event.endDateTime).getTime();
      const correctHasEnded = correctEndTime < now;

      if (
        entry.eventStartTime !== correctStartTime ||
        entry.eventEndTime !== correctEndTime ||
        entry.hasEnded !== correctHasEnded
      ) {
        affected++;
      }
    }

    return {
      processed: result.page.length,
      affected,
      skipped,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

// --- Orchestrating actions ---

const BATCH_SIZE = 2048;

export const fix2027FeedDates = internalAction({
  args: {},
  returns: v.object({
    userFeeds: v.object({
      totalProcessed: v.number(),
      totalUpdated: v.number(),
      totalSkipped: v.number(),
    }),
    userFeedGroups: v.object({
      totalProcessed: v.number(),
      totalUpdated: v.number(),
      totalSkipped: v.number(),
    }),
  }),
  handler: async (ctx) => {
    // Migrate userFeeds
    let feedsProcessed = 0;
    let feedsUpdated = 0;
    let feedsSkipped = 0;
    let cursor: string | null = null;

    while (true) {
      const result: {
        processed: number;
        updated: number;
        skipped: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.migrations.fix2027FeedDates.migrateFeedsBatch,
        { cursor, batchSize: BATCH_SIZE },
      );

      feedsProcessed += result.processed;
      feedsUpdated += result.updated;
      feedsSkipped += result.skipped;

      if (result.isDone) break;
      cursor = result.nextCursor;
    }

    console.log(
      `userFeeds: ${feedsUpdated} updated, ${feedsSkipped} skipped (event not found), ${feedsProcessed} total scanned`,
    );

    // Migrate userFeedGroups
    let groupsProcessed = 0;
    let groupsUpdated = 0;
    let groupsSkipped = 0;
    cursor = null;

    while (true) {
      const result: {
        processed: number;
        updated: number;
        skipped: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.migrations.fix2027FeedDates.migrateGroupsBatch,
        { cursor, batchSize: BATCH_SIZE },
      );

      groupsProcessed += result.processed;
      groupsUpdated += result.updated;
      groupsSkipped += result.skipped;

      if (result.isDone) break;
      cursor = result.nextCursor;
    }

    console.log(
      `userFeedGroups: ${groupsUpdated} updated, ${groupsSkipped} skipped (event not found), ${groupsProcessed} total scanned`,
    );

    return {
      userFeeds: {
        totalProcessed: feedsProcessed,
        totalUpdated: feedsUpdated,
        totalSkipped: feedsSkipped,
      },
      userFeedGroups: {
        totalProcessed: groupsProcessed,
        totalUpdated: groupsUpdated,
        totalSkipped: groupsSkipped,
      },
    };
  },
});

export const dryRunFix2027FeedDates = internalAction({
  args: {},
  returns: v.object({
    userFeeds: v.object({
      totalProcessed: v.number(),
      totalAffected: v.number(),
      totalSkipped: v.number(),
    }),
    userFeedGroups: v.object({
      totalProcessed: v.number(),
      totalAffected: v.number(),
      totalSkipped: v.number(),
    }),
  }),
  handler: async (ctx) => {
    // Dry run userFeeds
    let feedsProcessed = 0;
    let feedsAffected = 0;
    let feedsSkipped = 0;
    let cursor: string | null = null;

    while (true) {
      const result: {
        processed: number;
        affected: number;
        skipped: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runQuery(
        internal.migrations.fix2027FeedDates.dryRunFeedsBatch,
        { cursor, batchSize: BATCH_SIZE },
      );

      feedsProcessed += result.processed;
      feedsAffected += result.affected;
      feedsSkipped += result.skipped;

      if (result.isDone) break;
      cursor = result.nextCursor;
    }

    console.log(
      `[DRY RUN] userFeeds: ${feedsAffected} would update, ${feedsSkipped} missing events, ${feedsProcessed} total scanned`,
    );

    // Dry run userFeedGroups
    let groupsProcessed = 0;
    let groupsAffected = 0;
    let groupsSkipped = 0;
    cursor = null;

    while (true) {
      const result: {
        processed: number;
        affected: number;
        skipped: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runQuery(
        internal.migrations.fix2027FeedDates.dryRunGroupsBatch,
        { cursor, batchSize: BATCH_SIZE },
      );

      groupsProcessed += result.processed;
      groupsAffected += result.affected;
      groupsSkipped += result.skipped;

      if (result.isDone) break;
      cursor = result.nextCursor;
    }

    console.log(
      `[DRY RUN] userFeedGroups: ${groupsAffected} would update, ${groupsSkipped} missing events, ${groupsProcessed} total scanned`,
    );

    return {
      userFeeds: {
        totalProcessed: feedsProcessed,
        totalAffected: feedsAffected,
        totalSkipped: feedsSkipped,
      },
      userFeedGroups: {
        totalProcessed: groupsProcessed,
        totalAffected: groupsAffected,
        totalSkipped: groupsSkipped,
      },
    };
  },
});
