import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalAction, internalQuery } from "./_generated/server";
import * as AI from "./model/ai";
import * as Notifications from "./model/notifications";
import * as OneSignal from "./model/oneSignal";
import { createDeepLink } from "./model/utils/urlScheme";
import { generateNotificationId } from "./utils";

/**
 * Send a single notification to a specific user
 */
export const sendSingleNotification = action({
  args: {
    userId: v.string(),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    data: v.optional(v.record(v.string(), v.any())),
  },
  returns: v.object({
    success: v.boolean(),
    id: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    const { userId, title, body, url, data } = args;

    const notificationId = generateNotificationId();

    try {
      const result = await OneSignal.sendNotification({
        userId,
        title,
        body,
        url,
        data: {
          ...data,
          notificationId,
        },
        source: "notification_router",
        method: "single",
      });

      return {
        success: result.success,
        id: result.id,
        error: result.error,
      };
    } catch (error) {
      console.error("Error sending notification:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

/**
 * Send weekly notifications to all users
 */
export const sendWeeklyNotifications = internalAction({
  args: {},
  returns: v.object({
    success: v.boolean(),
    totalProcessed: v.number(),
    successfulNotifications: v.number(),
    errors: v.array(
      v.object({
        userId: v.string(),
        error: v.string(),
      }),
    ),
  }),
  handler: async (
    ctx,
    _args,
  ): Promise<{
    success: boolean;
    totalProcessed: number;
    successfulNotifications: number;
    errors: { userId: string; error: string }[];
  }> => {
    // Get all users
    const allUsers: {
      id: string;
      username: string;
      email: string;
      displayName: string;
    }[] = await ctx.runQuery(internal.notifications.getAllUsersQuery);

    // Process notifications concurrently
    const results = await Promise.all(
      allUsers.map(
        async (user: {
          id: string;
          username: string;
          email: string;
          displayName: string;
        }) => {
          try {
            const result: {
              success: boolean;
              id?: string;
              error?: string;
              notificationId: string;
              userId: string;
            } = await ctx.runAction(
              internal.notifications.processUserWeeklyNotification,
              {
                userId: user.id,
              },
            );
            return result;
          } catch (error) {
            console.error("Error processing user weekly notification:", error);
            const errorResult = {
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
              notificationId: generateNotificationId(),
              userId: user.id,
            };

            return errorResult;
          }
        },
      ),
    );

    return {
      success: true,
      totalProcessed: allUsers.length,
      successfulNotifications: results.filter((r) => r.success).length,
      errors: results
        .filter((r) => !r.success)
        .map((result) => ({
          userId: result.userId,
          error: result.error ?? "Unknown error",
        })),
    };
  },
});

/**
 * Send trial expiration reminders to users who started their trial 5 days ago
 */
export const sendTrialExpirationReminders = internalAction({
  args: {},
  returns: v.object({
    success: v.boolean(),
    totalProcessed: v.number(),
    successfulNotifications: v.number(),
    errors: v.array(
      v.object({
        error: v.string(),
      }),
    ),
  }),
  handler: async (
    ctx,
    _args,
  ): Promise<{
    success: boolean;
    totalProcessed: number;
    successfulNotifications: number;
    errors: { error: string }[];
  }> => {
    // Get users who started their trial 5 days ago
    const trialUsers: {
      id: string;
      username: string;
      email: string;
      displayName: string;
    }[] = await ctx.runQuery(
      internal.notifications.getTrialExpirationUsersQuery,
    );

    if (trialUsers.length === 0) {
      return {
        success: true,
        totalProcessed: 0,
        successfulNotifications: 0,
        errors: [],
      };
    }

    // Extract user IDs
    const userIds: string[] = trialUsers.map(
      (user: {
        id: string;
        username: string;
        email: string;
        displayName: string;
      }) => user.id,
    );

    // Send batch notification using OneSignal
    const result = await OneSignal.sendBatchNotifications({
      userIds,
      title: "2 days left on your trial",
      body: "Your subscription will change from trial to Soonlist Unlimited soon. Keep capturing your possibilities!",
      url: createDeepLink("settings/subscription"),
      data: {
        type: "trial_expiration",
      },
    });

    return {
      success: result.success,
      totalProcessed: userIds.length,
      successfulNotifications: result.success ? result.recipients || 0 : 0,
      errors: result.success
        ? []
        : [{ error: result.error || "Unknown error" }],
    };
  },
});

/**
 * Internal action to process a single user's weekly notification
 */
export const processUserWeeklyNotification = internalAction({
  args: { userId: v.string() },
  returns: v.object({
    success: v.boolean(),
    id: v.optional(v.string()),
    error: v.optional(v.string()),
    notificationId: v.string(),
    userId: v.string(),
  }),
  handler: async (ctx, args) => {
    const notificationId = generateNotificationId();

    try {
      // Get notification content for the user
      const content: {
        title: string;
        message: string;
        link: string;
        eventDescriptions?: string;
      } = await ctx.runQuery(
        internal.notifications.generateWeeklyNotificationContentQuery,
        {
          userId: args.userId,
        },
      );

      let message = content.message;
      const title = content.title;

      // If we have event descriptions, generate AI content
      if (content.eventDescriptions) {
        const prompt = Notifications.getPromptForWeeklyNotificationWithEvents(
          content.eventDescriptions,
        );

        try {
          const aiSummary = await AI.generateText({
            prompt,
            temperature: 0,
            maxTokens: 1000,
          });

          message = `See all events you captured: ${aiSummary}`;
        } catch (aiError) {
          console.error("AI generation failed, using fallback:", aiError);
          message =
            "See all events you captured: Your week is full of possibilities!";
        }
      }

      // Send notification using OneSignal
      const result = await OneSignal.sendNotification({
        userId: args.userId,
        title,
        body: message,
        url: content.link,
        data: { notificationId },
        source: "notification_router",
        method: "weekly",
      });

      return {
        success: result.success,
        id: result.id,
        error: result.error,
        notificationId,
        userId: args.userId,
      };
    } catch (error) {
      console.error(`Error processing user ${args.userId}:`, error);
      return {
        success: false,
        error:
          "An unexpected error occurred while processing the notification.",
        notificationId,
        userId: args.userId,
      };
    }
  },
});

/**
 * Internal query to generate weekly notification content for a user
 */
export const generateWeeklyNotificationContentQuery = internalQuery({
  args: { userId: v.string() },
  returns: v.object({
    title: v.string(),
    message: v.string(),
    link: v.string(),
    eventDescriptions: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    return await Notifications.generateWeeklyNotificationContent(
      ctx,
      args.userId,
    );
  },
});

/**
 * Internal query to get all users
 */
export const getAllUsersQuery = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      username: v.string(),
      email: v.string(),
      displayName: v.string(),
    }),
  ),
  handler: async (ctx) => {
    return await Notifications.getAllUsers(ctx);
  },
});

/**
 * Internal query to get trial expiration users
 */
export const getTrialExpirationUsersQuery = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      username: v.string(),
      email: v.string(),
      displayName: v.string(),
    }),
  ),
  handler: async (ctx) => {
    return await Notifications.getTrialExpirationUsers(ctx);
  },
});

// ============================================================================
// INTERNAL ACTIONS FOR WORKFLOW
// ============================================================================

/**
 * Send push notification for event creation
 */
export const push = internalAction({
  args: {
    eventId: v.string(),
    userId: v.string(),
    userName: v.string(),
    // Optional: for batch processing, explicitly pass the position
    batchPosition: v.optional(v.number()),
    batchTotal: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    id: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { eventId, userId, batchPosition, batchTotal } = args;

    // Get the event to extract the name for notification
    const event = await ctx.runQuery(internal.events.getEventById, {
      eventId,
    });

    if (!event) {
      return {
        success: false,
        error: "Event not found",
      };
    }

    // Determine the event count/position
    let eventCount: number;

    if (batchPosition !== undefined && batchTotal !== undefined) {
      // For batch processing, we need to get the count BEFORE this batch
      // and add the position within the batch
      const todayEvents = await ctx.runQuery(
        internal.events.getTodayEventsCount,
        { userId },
      );
      // Subtract the total batch size to get count before this batch
      // Then add the current position
      const countBeforeBatch = Math.max(0, todayEvents.length - batchTotal);
      eventCount = countBeforeBatch + batchPosition;
      console.log(
        `Batch notification: position ${batchPosition}/${batchTotal}, ` +
          `today's total: ${todayEvents.length}, count for this event: ${eventCount}`,
      );
    } else {
      // Get today's event count for this user (for non-batch captures)
      const todayEvents = await ctx.runQuery(
        internal.events.getTodayEventsCount,
        { userId },
      );
      eventCount = todayEvents.length;
      console.log(`Single event notification - today's count: ${eventCount}`);
    }

    // Generate notification content based on count
    let title: string;
    let subtitle: string;
    let body: string;

    if (eventCount === 1) {
      title = "Event captured ✨";
      body = "First capture today! 🤔 What's next?";
      subtitle = event.name;
    } else if (eventCount === 2) {
      title = "Event captured ✨";
      body = "2 captures today! ✌️ Keep 'em coming!";
      subtitle = event.name;
    } else if (eventCount === 3) {
      title = "Event captured ✨";
      body = "3 captures today! 🔥 You're on fire!";
      subtitle = event.name;
    } else {
      title = "Event captured ✨";
      body = `${eventCount} captures today! 🌌 The sky's the limit!`;
      subtitle = event.name;
    }

    // Create deep link
    const url = createDeepLink(`event/${eventId}`);

    // Send notification
    const result = await OneSignal.sendNotification({
      userId,
      title,
      subtitle,
      body,
      url,
      eventId,
      source: "workflow",
      method: "image",
    });

    return {
      success: result.success,
      id: result.id,
      error: result.error,
    };
  },
});

/**
 * Send failure notification for event creation
 */
export const pushBatchSummary = internalAction({
  args: {
    userId: v.string(),
    username: v.string(),
    message: v.string(),
    successCount: v.number(),
    failureCount: v.number(),
    batchId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    id: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { userId, message, successCount, failureCount } = args;

    // Get today's total event count
    const todayEvents = await ctx.runQuery(
      internal.events.getTodayEventsCount,
      { userId },
    );
    const totalCount = todayEvents.length;

    // Create batch summary notification with daily count
    let title: string;
    let subtitle: string | undefined;
    let body: string;

    if (failureCount === 0) {
      title = "Events captured ✨";
      subtitle = `Successfully captured ${successCount} events`;

      // Add daily count message
      if (totalCount === successCount && totalCount === 1) {
        body = "First capture today! 🤔 What's next?";
      } else if (totalCount === 2) {
        body = "2 captures today! ✌️ Keep 'em coming!";
      } else if (totalCount === 3) {
        body = "3 captures today! 🔥 You're on fire!";
      } else {
        body = `${totalCount} captures today! 🌌 The sky's the limit!`;
      }
    } else {
      title = "Event batch completed";
      subtitle = undefined;
      body = message;
    }
    const deepLink = createDeepLink(`batch/${args.batchId}`);

    // Send notification
    const result = await OneSignal.sendNotification({
      userId,
      title,
      subtitle,
      body,
      url: deepLink,
      data: {
        type: "batch_summary",
        successCount,
        failureCount,
      },
      source: "notification_router",
      method: "batch",
    });

    return {
      success: result.success,
      id: result.id,
      error: result.error,
    };
  },
});

export const pushFailure = internalAction({
  args: {
    userId: v.string(),
    userName: v.string(),
    failureReason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    id: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    const { userId, failureReason } = args;

    // Create failure notification content
    const title = "Event creation failed";
    const body = "We couldn't create your event. Please try again.";

    // Send notification
    const result = await OneSignal.sendNotification({
      userId,
      title,
      body,
      url: undefined,
      data: {
        isFailure: true,
        failureReason: failureReason || "Unknown error",
      },
      source: "workflow",
      method: "failure",
    });

    return {
      success: result.success,
      id: result.id,
      error: result.error,
    };
  },
});
