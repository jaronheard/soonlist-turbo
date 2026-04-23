import { v } from "convex/values";

import { components, internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import {
  eventFollowsAggregate,
  eventsByCreation,
  eventsByStartTime,
  listFollowsAggregate,
} from "../aggregates";

const BATCH_SIZE = 100;

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

export const initializeEventAggregates = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("Starting event aggregates initialization...");

    await ctx.scheduler.runAfter(
      0,
      internal.migrations.initializeAggregates.initializeEventAggregatesBatch,
      { cursor: null },
    );
    return null;
  },
});

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

export const initializeEventFollowsAggregates = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("Starting eventFollows aggregates initialization...");

    await ctx.scheduler.runAfter(
      0,
      internal.migrations.initializeAggregates
        .initializeEventFollowsAggregatesBatch,
      { cursor: null },
    );
    return null;
  },
});

export const initializeListFollowsAggregatesBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({
    isDone: v.boolean(),
    cursor: v.union(v.string(), v.null()),
    processedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db.query("listFollows").paginate({
      numItems: BATCH_SIZE,
      cursor: args.cursor,
    });

    console.log(`Processing batch of ${result.page.length} list follows...`);

    for (const follow of result.page) {
      await listFollowsAggregate.replaceOrInsert(ctx, follow, follow);
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.initializeAggregates
          .initializeListFollowsAggregatesBatch,
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

export const initializeListFollowsAggregates = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("Starting listFollows aggregates initialization...");

    await ctx.scheduler.runAfter(
      0,
      internal.migrations.initializeAggregates
        .initializeListFollowsAggregatesBatch,
      { cursor: null },
    );
    return null;
  },
});

export const initializeAllAggregates = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runMutation(components.eventsByCreation.public.clear, {});
    await ctx.runMutation(components.eventsByStartTime.public.clear, {});
    await ctx.runMutation(components.eventFollowsAggregate.public.clear, {});
    await ctx.runMutation(components.userFeedsAggregate.public.clear, {});
    await ctx.runMutation(components.listFollowsAggregate.public.clear, {});

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
      internal.migrations.initializeAggregates.initializeListFollowsAggregates,
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
