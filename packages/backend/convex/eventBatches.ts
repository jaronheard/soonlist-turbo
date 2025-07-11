import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";

// Batch tracking schema
export const batchStatusValidator = v.union(
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed"),
);

/**
 * Create a new batch tracking record
 */
export const createBatch = internalMutation({
  args: {
    batchId: v.string(),
    userId: v.string(),
    totalCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("eventBatches", {
      batchId: args.batchId,
      userId: args.userId,
      totalCount: args.totalCount,
      successCount: 0,
      failureCount: 0,
      status: "processing",
      createdAt: Date.now(),
    });
  },
});

/**
 * Update batch status after processing
 */
export const updateBatchStatus = internalMutation({
  args: {
    batchId: v.string(),
    successCount: v.number(),
    failureCount: v.number(),
    status: batchStatusValidator,
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("eventBatches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .first();

    if (!batch) {
      throw new ConvexError({
        message: "Batch not found",
        data: { batchId: args.batchId },
      });
    }

    await ctx.db.patch(batch._id, {
      successCount: args.successCount,
      failureCount: args.failureCount,
      status: args.status,
      completedAt: Date.now(),
    });
  },
});

/**
 * Send appropriate notification based on batch size
 */
export const sendBatchNotification = internalAction({
  args: {
    batchId: v.string(),
    userId: v.string(),
    username: v.string(),
    totalCount: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
  },
  handler: async (ctx, args) => {
    console.log("sendBatchNotification called with:", args);

    try {
      // Get the created events for this batch
      const events = await ctx.runQuery(
        internal.eventBatches.getEventsForBatch,
        {
          batchId: args.batchId,
        },
      );

      console.log(`Found ${events.length} events for batch ${args.batchId}`);

      // Determine notification strategy
      if (args.totalCount <= 3) {
        console.log("Sending individual notifications for small batch");

        // Send individual notifications for each successful event
        // Pass explicit position to ensure accurate count
        const results = [];
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          const position = i + 1; // 1-based position
          console.log(
            `Sending notification ${position}/${events.length} for event ${event.id}`,
          );
          try {
            // Add a small delay between notifications to ensure they arrive in order
            if (i > 0) {
              await new Promise((resolve) => setTimeout(resolve, 300));
            }

            const result = await ctx.runAction(internal.notifications.push, {
              eventId: event.id,
              userId: args.userId,
              userName: args.username,
              batchPosition: position,
              batchTotal: events.length,
            });
            console.log(`Notification result for event ${event.id}:`, result);
            results.push(result);
          } catch (error) {
            console.error(
              `Failed to send notification for event ${event.id}:`,
              error,
            );
            // Don't throw - we want to continue sending other notifications
            results.push({ success: false, error: String(error) });
          }
        }
        console.log("All individual notifications processed:", results);
      } else {
        console.log("Sending summary notification for large batch");

        // Send summary notification for batch
        const message =
          args.failureCount === 0
            ? `Successfully captured ${args.successCount} events`
            : `Captured ${args.successCount} of ${args.totalCount} events`;

        try {
          const result = await ctx.runAction(
            internal.notifications.pushBatchSummary,
            {
              userId: args.userId,
              username: args.username,
              message,
              successCount: args.successCount,
              failureCount: args.failureCount,
              batchId: args.batchId,
            },
          );
          console.log("Batch summary notification result:", result);
        } catch (error) {
          console.error("Failed to send batch summary notification:", error);
          throw error;
        }
      }
    } catch (error) {
      console.error("Error in sendBatchNotification:", error);
      throw error;
    }
  },
});

/**
 * Get events created in a batch
 */
export const getEventsForBatch = internalQuery({
  args: {
    batchId: v.string(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .collect();

    return events;
  },
});

/**
 * Get batch status for client polling
 */
export const getBatchStatus = query({
  args: {
    batchId: v.string(),
  },
  returns: v.object({
    batchId: v.string(),
    status: batchStatusValidator,
    totalCount: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
    progress: v.number(),
  }),
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("eventBatches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .first();

    if (!batch) {
      throw new ConvexError({
        message: "Batch not found",
        data: { batchId: args.batchId },
      });
    }

    const processedCount = batch.successCount + batch.failureCount;
    const progress =
      batch.totalCount > 0
        ? Math.round((processedCount / batch.totalCount) * 100)
        : 0;

    return {
      batchId: batch.batchId,
      status: batch.status,
      totalCount: batch.totalCount,
      successCount: batch.successCount,
      failureCount: batch.failureCount,
      progress,
    };
  },
});
