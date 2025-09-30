/**
 * Migration to initialize aggregates for existing events and eventFollows
 *
 * Run this once after deploying the aggregate changes to populate the
 * aggregates with existing data.
 */

import { v } from "convex/values";

import { components, internal } from "../_generated/api";
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
    const result = await ctx.db.query("events").paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor,
    });

    console.log(`Processing batch of ${result.page.length} events...`);

    for (const event of result.page) {
      await eventsByCreation.replaceOrInsert(ctx, event, event);
      await eventsByStartTime.replaceOrInsert(ctx, event, event);
    }

    // If there are more pages, schedule the next batch
    if (!result.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.initializeAggregates.initializeEventAggregatesBatch,
        { cursor: result.continueCursor },
      );
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

    // Kick off the first batch; subsequent batches self-schedule
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.initializeAggregates.initializeEventAggregatesBatch,
      { cursor: null },
    );
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
    const result = await ctx.db.query("eventFollows").paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor,
    });

    console.log(`Processing batch of ${result.page.length} event follows...`);

    for (const follow of result.page) {
      await eventFollowsAggregate.replaceOrInsert(ctx, follow, follow);
    }

    // If there are more pages, schedule the next batch
    if (!result.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.initializeAggregates
          .initializeEventFollowsAggregatesBatch,
        { cursor: result.continueCursor },
      );
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

    // Kick off the first batch; subsequent batches self-schedule
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.initializeAggregates
        .initializeEventFollowsAggregatesBatch,
      { cursor: null },
    );
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
    // Clear all namespaces once at the very beginning
    await ctx.runMutation(components.eventsByCreation.public.clear, {});
    await ctx.runMutation(components.eventsByStartTime.public.clear, {});
    await ctx.runMutation(components.eventFollowsAggregate.public.clear, {});
    await ctx.runMutation(components.userFeedsAggregate.public.clear, {});

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
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.initializeUserFeedsAggregate
        .initializeUserFeedsAggregate,
      {},
    );
    return null;
  },
});
