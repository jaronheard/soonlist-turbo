import { ConvexError, v } from "convex/values";

import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { DEFAULT_TIMEZONE, DEFAULT_VISIBILITY } from "./constants";
import { getNotificationContent } from "./model/notificationHelpers";

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
    // Validate timezone
    if (!args.timezone || args.timezone.trim() === "") {
      throw new ConvexError("Timezone is required");
    }

    // Check if timezone is supported (using a simple check)
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: args.timezone });
    } catch {
      throw new ConvexError(`Invalid timezone: ${args.timezone}`);
    }
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
      visibility: DEFAULT_VISIBILITY, // Private by default,
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
        await ctx.runAction(internal.notifications.pushBatchSummary, {
          userId: args.userId,
          username: args.username,
          message,
          successCount: args.successCount,
          failureCount: args.failureCount,
          batchId: args.batchId,
        });
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

// Notification content for individual events in a batch
const notificationContentValidator = v.object({
  title: v.string(),
  subtitle: v.string(),
  body: v.string(),
});

// Event info for banners
const eventInfoValidator = v.object({
  id: v.string(),
  name: v.string(),
  startDate: v.union(v.string(), v.null()),
  startTime: v.union(v.string(), v.null()),
  endTime: v.union(v.string(), v.null()),
  timeZone: v.union(v.string(), v.null()),
  image: v.union(v.string(), v.null()),
  visibility: v.union(v.literal("public"), v.literal("private")),
  notificationContent: notificationContentValidator,
});

/**
 * Get batch status for client polling
 * Includes notification content for completion feedback
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
    firstEventId: v.union(v.string(), v.null()),
    // Events with notification content for banners (only when completed)
    events: v.array(eventInfoValidator),
    // Summary content for batch summary banner (2+ events)
    batchSummaryContent: v.union(
      v.object({
        title: v.string(),
        subtitle: v.string(),
        body: v.string(),
      }),
      v.null(),
    ),
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

    // Get the first event ID if there's exactly one successful event
    let firstEventId: string | null = null;
    if (batch.successCount === 1) {
      const firstEvent = await ctx.db
        .query("events")
        .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
        .first();
      firstEventId = firstEvent?.id ?? null;
    }

    // Get events with notification content when batch is completed
    let events: {
      id: string;
      name: string;
      startDate: string | null;
      startTime: string | null;
      endTime: string | null;
      timeZone: string | null;
      image: string | null;
      visibility: "public" | "private";
      notificationContent: { title: string; subtitle: string; body: string };
    }[] = [];
    let batchSummaryContent: {
      title: string;
      subtitle: string;
      body: string;
    } | null = null;

    if (batch.status === "completed" || batch.status === "failed") {
      // Get events for this batch
      const batchEvents = await ctx.db
        .query("events")
        .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
        .collect();

      // Get today's event count for this user (for notification content).
      // Compute day boundaries in the batch's timezone so daily counts
      // are accurate regardless of where the server is located.
      const tz = batch.timezone ?? DEFAULT_TIMEZONE;
      const { startOfDay, endOfDay } = getDayBoundsForTimezone(tz);

      const todayEvents = await ctx.db
        .query("events")
        .withIndex("by_user", (q) => q.eq("userId", batch.userId))
        .filter((q) =>
          q.and(
            q.gte(q.field("created_at"), startOfDay.toISOString()),
            q.lte(q.field("created_at"), endOfDay.toISOString()),
          ),
        )
        .collect();

      const totalTodayCount = todayEvents.length;

      // For 1 event, provide individual event info with notification content
      if (batch.totalCount <= 1) {
        // Calculate position for each event
        const countBeforeBatch = Math.max(
          0,
          totalTodayCount - batchEvents.length,
        );

        events = batchEvents.map((event, index) => {
          const position = countBeforeBatch + index + 1;
          const content = getNotificationContent(event.name ?? "", position);
          // Extract event data safely - the event field contains the calendar event JSON
          const eventData = event.event as
            | {
                startDate?: string;
                startTime?: string;
                endTime?: string;
                timeZone?: string;
                images?: (string | null)[];
              }
            | undefined;
          return {
            id: event.id,
            name: event.name ?? "",
            startDate: eventData?.startDate ?? null,
            startTime: eventData?.startTime ?? null,
            endTime: eventData?.endTime ?? null,
            timeZone: eventData?.timeZone ?? null,
            image: eventData?.images?.[3] ?? null,
            visibility: event.visibility,
            notificationContent: content,
          };
        });
      } else {
        // For 4+ events, provide batch summary content
        if (batch.failureCount === 0) {
          batchSummaryContent = {
            title: "Events captured ✨",
            subtitle: `Successfully captured ${batch.successCount} events`,
            body:
              totalTodayCount === batch.successCount && totalTodayCount === 1
                ? "First capture today! 🤔 What's next?"
                : totalTodayCount === 2
                  ? "2 captures today! ✌️ Keep 'em coming!"
                  : totalTodayCount === 3
                    ? "3 captures today! 🔥 You're on fire!"
                    : `${totalTodayCount} captures today! 🌌 The sky's the limit!`,
          };
        } else {
          batchSummaryContent = {
            title: "Event batch completed",
            subtitle: `Captured ${batch.successCount} of ${batch.totalCount} events`,
            body: `${batch.failureCount} image${batch.failureCount > 1 ? "s" : ""} failed to process`,
          };
        }
      }
    }

    return {
      batchId: batch.batchId,
      status: batch.status,
      totalCount: batch.totalCount,
      successCount: batch.successCount,
      failureCount: batch.failureCount,
      progress,
      firstEventId,
      events,
      batchSummaryContent,
    };
  },
});

/**
 * Get the start and end of "today" as Date objects in UTC,
 * where "today" is determined by the given IANA timezone.
 *
 * For example, at 2024-03-15T02:00:00Z:
 * - In "America/New_York" (UTC-4), it's still March 14, so this returns
 *   March 14 00:00 ET -> March 14 04:00 UTC  to  March 14 23:59:59.999 ET -> March 15 03:59:59.999 UTC
 * - In "Asia/Tokyo" (UTC+9), it's already March 15, so this returns
 *   March 15 00:00 JST -> March 14 15:00 UTC  to  March 15 23:59:59.999 JST -> March 15 14:59:59.999 UTC
 */
function getDayBoundsForTimezone(tz: string): {
  startOfDay: Date;
  endOfDay: Date;
} {
  const now = new Date();

  // Use Intl to get the current date parts in the target timezone
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const year = get("year");
  const month = get("month"); // 1-based
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");

  // Compute the UTC offset for this timezone at this instant.
  // We build a Date from the wall-clock parts (interpreted as UTC) and
  // compare it to the real UTC instant (`now`).
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMs = wallAsUtc - now.getTime();

  // Build midnight and end-of-day in the target timezone as UTC timestamps
  const midnightWallUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const endWallUtc = Date.UTC(year, month - 1, day, 23, 59, 59, 999);

  return {
    startOfDay: new Date(midnightWallUtc - offsetMs),
    endOfDay: new Date(endWallUtc - offsetMs),
  };
}
