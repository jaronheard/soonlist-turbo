import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, mutation } from "./_generated/server";

export const backfillEventEmbeddings = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
    lastProcessedId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 50;

    // Query events without embeddings
    let query = ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("embedding"), undefined));

    // If we have a lastProcessedId, continue from there
    if (args.lastProcessedId) {
      query = query.filter((q) => q.gt(q.field("_id"), args.lastProcessedId));
    }

    const events = await query.take(batchSize);

    if (events.length === 0) {
      console.log("Backfill complete - all events have embeddings");
      return { processed: 0, complete: true };
    }

    // Schedule embedding generation for each event
    for (const event of events) {
      await ctx.scheduler.runAfter(0, internal.embeddings.generateEmbedding, {
        eventId: event._id,
      });
    }

    const lastEventId = events[events.length - 1]._id;

    console.log(`Scheduled embedding generation for ${events.length} events`);

    // Schedule the next batch
    if (events.length === batchSize) {
      await ctx.scheduler.runAfter(
        1000,
        internal.backfillEmbeddings.backfillEventEmbeddings,
        {
          batchSize,
          lastProcessedId: lastEventId,
        },
      );
    }

    return {
      processed: events.length,
      complete: events.length < batchSize,
      lastProcessedId: lastEventId,
    };
  },
});

export const startBackfill = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(
      0,
      internal.backfillEmbeddings.backfillEventEmbeddings,
      {
        batchSize: 50,
      },
    );
    return { started: true };
  },
});
