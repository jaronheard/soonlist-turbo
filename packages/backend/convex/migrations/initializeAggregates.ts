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

/**
 * Initialize aggregates for all existing events
 */
export const initializeEventAggregates = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("Starting event aggregates initialization...");

    const events = await ctx.db.query("events").collect();
    console.log(`Found ${events.length} events to process`);

    for (const event of events) {
      await eventsByCreation.insert(ctx, event);
      await eventsByStartTime.insert(ctx, event);
    }

    console.log("Event aggregates initialization complete!");
    return null;
  },
});

/**
 * Initialize aggregates for all existing eventFollows
 */
export const initializeEventFollowsAggregates = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("Starting eventFollows aggregates initialization...");

    const follows = await ctx.db.query("eventFollows").collect();
    console.log(`Found ${follows.length} event follows to process`);

    for (const follow of follows) {
      await eventFollowsAggregate.insert(ctx, follow);
    }

    console.log("EventFollows aggregates initialization complete!");
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
    await ctx.runMutation(
      internal.migrations.initializeAggregates.initializeEventAggregates,
      {},
    );
    await ctx.runMutation(
      internal.migrations.initializeAggregates.initializeEventFollowsAggregates,
      {},
    );
    return null;
  },
});
