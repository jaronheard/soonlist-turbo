import { ConvexError, v } from "convex/values";

import type { ActionCtx } from "./_generated/server";
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
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    // Get username from user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.userId))
      .first();

    await ctx.db.insert("eventBatches", {
      batchId: args.batchId,
      userId: args.userId,
      username: user?.username,
      timezone: args.timezone,
      totalCount: args.totalCount,
      successCount: 0,
      failureCount: 0,
      status: "processing",
      progress: 0,
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
export const sendBatchNotificationWithErrors = internalAction({
  args: {
    batchId: v.string(),
    userId: v.string(),
    username: v.string(),
    totalCount: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
    failedImages: v.array(
      v.object({
        tempId: v.string(),
        error: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    try {
      // Call the original sendBatchNotification logic but with enhanced error details
      return await sendBatchNotificationHandler(ctx, args);
    } catch (error) {
      console.error("Error in sendBatchNotificationWithErrors:", error);
      throw error;
    }
  },
});

/**
 * Get batch info for processing additional images
 */
export const getBatchInfo = internalQuery({
  args: {
    batchId: v.string(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("eventBatches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .first();

    if (!batch) {
      return null;
    }

    return {
      ...batch,
      comment: undefined, // Events don't store comments
      lists: [], // Events don't store lists directly
      visibility: "private", // Private by default,
    };
  },
});

/**
 * Increment batch progress as images are processed
 */
export const incrementBatchProgress = internalMutation({
  args: {
    batchId: v.string(),
    successCount: v.number(),
    failureCount: v.number(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("eventBatches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .first();

    if (!batch) {
      throw new ConvexError("Batch not found");
    }

    const newSuccessCount = batch.successCount + args.successCount;
    const newFailureCount = batch.failureCount + args.failureCount;
    const newProgress = Math.min(
      1,
      (newSuccessCount + newFailureCount) / batch.totalCount,
    );

    await ctx.db.patch(batch._id, {
      successCount: newSuccessCount,
      failureCount: newFailureCount,
      progress: newProgress,
      // Update status if all images are processed
      status: newProgress >= 1 ? "completed" : "processing",
    });

    // Check if we should send the batch notification
    if (newProgress >= 1) {
      // Get the full batch details for notification
      const updatedBatch = await ctx.db.get(batch._id);
      if (updatedBatch) {
        await ctx.scheduler.runAfter(
          0,
          internal.eventBatches.sendBatchNotificationWithErrors,
          {
            batchId: args.batchId,
            userId: updatedBatch.userId,
            username: updatedBatch.username ?? "unknown",
            totalCount: updatedBatch.totalCount,
            successCount: newSuccessCount,
            failureCount: newFailureCount,
            failedImages: [], // Empty for incremental updates
          },
        );
      }
    }
  },
});

// Keep the original for backward compatibility
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
    // Call the handler with empty failed images array
    return await sendBatchNotificationHandler(ctx, {
      ...args,
      failedImages: [],
    });
  },
});

// Shared handler function
async function sendBatchNotificationHandler(
  ctx: ActionCtx,
  args: {
    batchId: string;
    userId: string;
    username: string;
    totalCount: number;
    successCount: number;
    failureCount: number;
    failedImages?: { tempId: string; error: string }[];
  },
) {
  try {
    // Get the created events for this batch
    const events = await ctx.runQuery(internal.eventBatches.getEventsForBatch, {
      batchId: args.batchId,
    });

    // Determine notification strategy
    if (args.totalCount <= 3) {
      // Send individual notifications for each successful event
      // Pass explicit position to ensure accurate count
      const results = [];
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (!event) {
          console.error(`Event at index ${i} is undefined`);
          continue;
        }
        const position = i + 1; // 1-based position
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
    } else {
      // Build enhanced message with error details
      let message: string;
      if (args.failureCount === 0) {
        message = `Successfully captured ${args.successCount} events`;
      } else {
        message = `Captured ${args.successCount} of ${args.totalCount} events`;

        // Add specific error details if available
        if (args.failedImages && args.failedImages.length > 0) {
          const errorSummary = args.failedImages
            .slice(0, 3) // Show first 3 errors
            .map((img, idx) => `${idx + 1}. ${img.error}`)
            .join("\n");

          message += `\n\nFailed to process ${args.failureCount} image${args.failureCount > 1 ? "s" : ""}:\n${errorSummary}`;

          if (args.failedImages.length > 3) {
            message += `\n...and ${args.failedImages.length - 3} more`;
          }
        }
      }

      try {
        await ctx.runAction(
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
      } catch (error) {
        console.error("Failed to send batch summary notification:", error);
        throw error;
      }
    }
  } catch (error) {
    console.error("Error in sendBatchNotificationHandler:", error);
    throw error;
  }
}

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
