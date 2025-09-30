/**
 * Migration to initialize aggregates for existing events and eventFollows
 *
 * Run this once after deploying the aggregate changes to populate the
 * aggregates with existing data.
 */

import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import {
  eventFollowsAggregate,
  eventsByCreation,
  eventsByStartTime,
} from "../aggregates";

const BATCH_SIZE = 100;

/**
 * Initialize aggregates for a batch of events
 */
export const initializeEventAggregatesBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({
    isDone: v.boolean(),
    cursor: v.union(v.string(), v.null()),
    processedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const clearedNamespaces = new Set<string>();
    const result = await ctx.db.query("events").paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor,
    });

    console.log(`Processing batch of ${result.page.length} events...`);

    for (const event of result.page) {
      if (!clearedNamespaces.has(event.userId)) {
        await eventsByCreation.clear(ctx, { namespace: event.userId });
        await eventsByStartTime.clear(ctx, { namespace: event.userId });
        clearedNamespaces.add(event.userId);
      }
      await eventsByCreation.replaceOrInsert(ctx, event, event);
      await eventsByStartTime.replaceOrInsert(ctx, event, event);
    }

    return {
      isDone: result.isDone,
      cursor: result.continueCursor,
      processedCount: result.page.length,
    };
  },
});

/**
 * Initialize aggregates for all existing events (orchestrator)
 */
export const initializeEventAggregates = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("Starting event aggregates initialization...");

    // Note: We clear per-namespace inside the batch to avoid requiring a full scan of namespaces

    let cursor: string | null = null;
    let totalProcessed = 0;
    let batchNumber = 0;
    let done = false;

    while (!done) {
      const result: {
        isDone: boolean;
        cursor: string | null;
        processedCount: number;
      } = await ctx.runMutation(
        internal.migrations.initializeAggregates.initializeEventAggregatesBatch,
        { cursor },
      );

      batchNumber++;
      totalProcessed += result.processedCount;
      cursor = result.cursor;

      console.log(
        `Completed batch ${batchNumber}, processed ${totalProcessed} events total`,
      );

      if (result.isDone) {
        console.log(
          `Event aggregates initialization complete! Processed ${totalProcessed} total events`,
        );
        done = true;
        break;
      }

      // Schedule next batch
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.initializeAggregates.initializeEventAggregatesBatch,
        { cursor },
      );

      // Exit this mutation and let the scheduled one continue
      return null;
    }

    return null;
  },
});

/**
 * Initialize aggregates for a batch of eventFollows
 */
export const initializeEventFollowsAggregatesBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({
    isDone: v.boolean(),
    cursor: v.union(v.string(), v.null()),
    processedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const clearedNamespaces = new Set<string>();
    const result = await ctx.db.query("eventFollows").paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor,
    });

    console.log(`Processing batch of ${result.page.length} event follows...`);

    for (const follow of result.page) {
      if (!clearedNamespaces.has(follow.userId)) {
        await eventFollowsAggregate.clear(ctx, { namespace: follow.userId });
        clearedNamespaces.add(follow.userId);
      }
      await eventFollowsAggregate.replaceOrInsert(ctx, follow, follow);
    }

    return {
      isDone: result.isDone,
      cursor: result.continueCursor,
      processedCount: result.page.length,
    };
  },
});

/**
 * Initialize aggregates for all existing eventFollows (orchestrator)
 */
export const initializeEventFollowsAggregates = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("Starting eventFollows aggregates initialization...");

    // Note: We clear per-namespace inside the batch to avoid requiring a full scan of namespaces

    let cursor: string | null = null;
    let totalProcessed = 0;
    let batchNumber = 0;
    let done = false;

    while (!done) {
      const result: {
        isDone: boolean;
        cursor: string | null;
        processedCount: number;
      } = await ctx.runMutation(
        internal.migrations.initializeAggregates
          .initializeEventFollowsAggregatesBatch,
        { cursor },
      );

      batchNumber++;
      totalProcessed += result.processedCount;
      cursor = result.cursor;

      console.log(
        `Completed batch ${batchNumber}, processed ${totalProcessed} event follows total`,
      );

      if (result.isDone) {
        console.log(
          `EventFollows aggregates initialization complete! Processed ${totalProcessed} total event follows`,
        );
        done = true;
        break;
      }

      // Schedule next batch
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.initializeAggregates
          .initializeEventFollowsAggregatesBatch,
        { cursor },
      );

      // Exit this mutation and let the scheduled one continue
      return null;
    }

    return null;
  },
});

/**
 * Run all aggregate initializations
 */
export const initializeAllAggregates = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.initializeAggregates.initializeEventAggregates,
      {},
    );
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.initializeAggregates.initializeEventFollowsAggregates,
      {},
    );
    return null;
  },
});
