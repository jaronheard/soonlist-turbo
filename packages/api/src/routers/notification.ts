import type {
  ExpoPushMessage,
  ExpoPushTicket,
  ExpoPushToken,
} from "expo-server-sdk";
import { Expo } from "expo-server-sdk";
import { anthropic } from "@ai-sdk/anthropic";
import { TRPCError } from "@trpc/server";
import { waitUntil } from "@vercel/functions";
import { generateText } from "ai";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { Langfuse } from "langfuse";
import { z } from "zod";

import type { AddToCalendarButtonProps } from "@soonlist/cal/types";
import { db, inArray, or } from "@soonlist/db";
import { eventFollows, events, pushTokens, users } from "@soonlist/db/schema";

import { createTRPCRouter, publicProcedure } from "../trpc";
import { getTicketId } from "../utils/expo";
import { generateNotificationId } from "../utils/notification";
import { posthog } from "../utils/posthog";

// Create a single Expo SDK client to be reused
const expo = new Expo();

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
  secretKey: process.env.LANGFUSE_SECRET_KEY || "",
  baseUrl: process.env.LANGFUSE_BASE_URL || "",
});

// Define the input schema for the sendNotification procedure
const sendNotificationInputSchema = z.object({
  expoPushToken: z
    .string()
    .refine(
      (token): token is ExpoPushToken => Expo.isExpoPushToken(token),
      "Invalid Expo push token",
    ),
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()).optional(),
});

/**
 * Generates a prompt for creating a weekly notification with events.
 *
 * @param eventDescriptions - A string containing event descriptions, separated by "NEXT EVENT"
 * @returns A string containing the generated prompt
 */
const getPromptForWeeklyNotificationWithEvents = (
  eventDescriptions: string,
) => `You are tasked with creating an exciting and rich notification for a user's upcoming week based on their saved events. Your goal is to generate a concise, engaging message that fits into a single notification and captures the essence of the week's possibilities.

Here is the list of events for the upcoming week separated by "NEXT EVENT":
<events>
${eventDescriptions}
</events>

Follow these steps to create the notification:

1. For each event, identify the most specific and evocative single-word adjective-noun pairs that uniquely apply to that event. Be creative and don't hesitate to use esoteric or simple adjectives.

2. From the list of adjective-noun pairs you've generated, select the top three that would provide the most complete abstract picture of the week's possibilities. These should be diverse and capture different aspects of the events.

3. Format your output as follows:
   - Start with the three selected adjective-noun pairs, each preceded by a relevant emoji

4. Use Spotify's Daylists as inspiration for the tone and style. Incorporate uncommon emojis where appropriate.

5. Ensure the entire message fits into a single notification. Do not include "THIS WEEK" or any other preface. Begin directly with the adjective-noun pairs.

Example output:
🧠 Cerebral discussions, 🌀 Mesmerizing animations, 🎭 Avant-garde showcases

Remember to vary your output for different weeks, maintaining the exciting and unique elements that make each week special.`;

async function processUserNotification(user: {
  userId: string;
  expoPushToken: string;
}): Promise<{
  success: boolean;
  ticket?: ExpoPushTicket;
  error?: string;
  notificationId: string;
  userId: string;
}> {
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    // Fetch upcoming events for the user
    const upcomingEvents = await db
      .select()
      .from(events)
      .where(
        and(
          or(
            eq(events.userId, user.userId),
            inArray(
              events.id,
              db
                .select({ eventId: eventFollows.eventId })
                .from(eventFollows)
                .where(eq(eventFollows.userId, user.userId)),
            ),
          ),
          gt(events.startDateTime, now),
          lt(events.endDateTime, oneWeekFromNow),
        ),
      );

    let title = `🤩 ${upcomingEvents.length} possibilities this week`;
    let link = "/feed";
    let prefix = "See all events you captured: ";
    let summary = "";

    if (upcomingEvents.length === 0) {
      title = "😳 No possibilities this week";
      link = "/feed";
      prefix = "";
      summary =
        "Screenshots of events still hiding in your photos? Capture them now to remember!";
    } else if (upcomingEvents.length < 3) {
      title = `😌 ${upcomingEvents.length} possibilities this week`;
      link = "/feed";
      prefix = "";
      summary =
        "Keep capturing events you see. Missing any? Check your screenshots now!";
    } else {
      const eventDescriptions = upcomingEvents
        .map((event) => {
          const eventData = event.event as AddToCalendarButtonProps;
          return `${eventData.name} ${eventData.description}`;
        })
        .join(" NEXT EVENT ");

      const prompt =
        getPromptForWeeklyNotificationWithEvents(eventDescriptions);

      const trace = langfuse.trace({
        name: "sendWeeklyNotifications",
        userId: user.userId,
        input: eventDescriptions,
      });

      const generation = trace.generation({
        name: "generateWeeklyNotification",
        input: eventDescriptions,
        model: "claude-3-5-sonnet-20240620",
      });

      generation.update({
        completionStartTime: new Date(),
      });

      const { text } = await generateText({
        // @ts-expect-error need to update ai sdk
        model: anthropic("claude-3-5-sonnet-20240620"),
        prompt,
        temperature: 0,
        maxTokens: 1000,
      });

      summary = text;

      generation.end({
        output: summary,
      });

      generation.score({
        name: "notificationGeneration",
        value: summary ? 1 : 0,
      });

      trace.update({
        output: summary,
        metadata: {
          eventDescriptions,
        },
      });
    }

    const message = `${prefix}${summary}`;

    if (Expo.isExpoPushToken(user.expoPushToken)) {
      const notificationId = generateNotificationId();
      const [ticket] = await expo.sendPushNotificationsAsync([
        {
          to: user.expoPushToken,
          sound: "default",
          title,
          body: message,
          data: { url: link, notificationId },
        },
      ]);
      return { success: true, ticket, notificationId, userId: user.userId };
    }
    return {
      success: false,
      error: "Invalid push token",
      notificationId: generateNotificationId(),
      userId: user.userId,
    };
  } catch (error) {
    console.error(`Error processing user ${user.userId}:`, error);
    return {
      success: false,
      error: "An unexpected error occurred while processing the notification.",
      notificationId: generateNotificationId(),
      userId: user.userId,
    };
  } finally {
    // Use waitUntil for non-blocking Langfuse flush
    waitUntil(langfuse.flushAsync());
  }
}

export const notificationRouter = createTRPCRouter({
  sendMarketingNotification: publicProcedure
    .input(
      z.object({
        cronSecret: z.string(),
        title: z.string(),
        body: z.string(),
        data: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Check if the provided cronSecret matches the environment variable
      if (input.cronSecret !== process.env.CRON_SECRET) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid CRON_SECRET",
        });
      }

      // Fetch all users with valid push tokens
      const usersWithTokens = await db
        .select({
          userId: pushTokens.userId,
          expoPushToken: pushTokens.expoPushToken,
        })
        .from(pushTokens)
        .innerJoin(
          users,
          sql`${users.id} COLLATE utf8mb4_unicode_ci = ${pushTokens.userId} COLLATE utf8mb4_unicode_ci`,
        )
        .where(
          sql`${pushTokens.expoPushToken} != 'Error: Must use physical device for push notifications'`,
        );

      // Process notifications concurrently
      const results = await Promise.all(
        usersWithTokens.map(async (user) => {
          const notificationId = generateNotificationId();
          try {
            if (!Expo.isExpoPushToken(user.expoPushToken)) {
              return {
                success: false,
                error: "Invalid push token",
                notificationId,
                userId: user.userId,
              };
            }

            const message: ExpoPushMessage = {
              to: user.expoPushToken,
              sound: "default",
              title: input.title,
              body: input.body,
              data: {
                ...input.data,
                notificationId,
              },
            };

            const [ticket] = await expo.sendPushNotificationsAsync([message]);

            posthog.capture({
              distinctId: user.userId,
              event: "notification_sent",
              properties: {
                success: true,
                notificationId,
                type: "marketing",
                source: "notification_router",
                title: input.title,
                hasData: !!input.data,
                ticketId: getTicketId(ticket),
              },
            });

            return {
              success: true,
              ticket,
              notificationId,
              userId: user.userId,
            };
          } catch (error) {
            posthog.capture({
              distinctId: user.userId,
              event: "notification_sent",
              properties: {
                success: false,
                notificationId,
                type: "marketing",
                error: (error as Error).message,
                title: input.title,
                hasData: !!input.data,
              },
            });

            return {
              success: false,
              error: (error as Error).message,
              notificationId,
              userId: user.userId,
            };
          }
        }),
      );

      // Track batch results
      posthog.capture({
        distinctId: "system",
        event: "marketing_notifications_batch",
        properties: {
          totalProcessed: usersWithTokens.length,
          successfulNotifications: results.filter((r) => r.success).length,
          failedNotifications: results.filter((r) => !r.success).length,
        },
      });

      return {
        success: true,
        totalProcessed: usersWithTokens.length,
        successfulNotifications: results.filter((r) => r.success).length,
        errors: results
          .filter((r) => !r.success)
          .map((result) => ({
            userId: result.userId,
            error: result.error ?? "Unknown error",
          })),
      };
    }),
  sendSingleNotification: publicProcedure
    .input(sendNotificationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { expoPushToken, title, body, data } = input;

      if (!Expo.isExpoPushToken(expoPushToken)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid Expo push token",
        });
      }

      const notificationId = generateNotificationId();
      const message: ExpoPushMessage = {
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data: {
          ...data,
          notificationId,
        },
      };

      try {
        const [ticket] = await expo.sendPushNotificationsAsync([message]);

        posthog.capture({
          distinctId: ctx.auth.userId || "anonymous",
          event: "notification_sent",
          properties: {
            success: true,
            notificationId,
            type: "single",
            source: "notification_router",
            title,
            hasData: !!data,
            ticketId: getTicketId(ticket),
          },
        });

        return {
          success: true,
          ticket,
        };
      } catch (error) {
        posthog.capture({
          distinctId: ctx.auth.userId || "anonymous",
          event: "notification_sent",
          properties: {
            success: false,
            notificationId,
            type: "single",
            error: (error as Error).message,
            title,
            hasData: !!data,
          },
        });

        console.error("Error sending notification:", error);
        return {
          success: false,
          error: (error as Error).message,
        };
      }
    }),

  sendWeeklyNotifications: publicProcedure
    .input(z.object({ cronSecret: z.string() }))
    .mutation(async ({ input }) => {
      // Check if the provided cronSecret matches the environment variable
      if (input.cronSecret !== process.env.CRON_SECRET) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid CRON_SECRET",
        });
      }

      // Fetch all users with valid push tokens
      const usersWithTokens = await db
        .select({
          userId: pushTokens.userId,
          expoPushToken: pushTokens.expoPushToken,
        })
        .from(pushTokens)
        .innerJoin(
          users,
          sql`${users.id} COLLATE utf8mb4_unicode_ci = ${pushTokens.userId} COLLATE utf8mb4_unicode_ci`,
        )
        .where(
          sql`${pushTokens.expoPushToken} != 'Error: Must use physical device for push notifications'`,
        );

      // Process notifications concurrently
      const results = await Promise.all(
        usersWithTokens.map(async (user) => {
          try {
            const result = await processUserNotification(user);

            posthog.capture({
              distinctId: user.userId,
              event: "notification_sent",
              properties: {
                success: result.success,
                notificationId: result.notificationId,
                type: "weekly",
                source: "notification_router",
                ticketId: result.ticket
                  ? getTicketId(result.ticket)
                  : undefined,
                error: result.error,
              },
            });

            return result;
          } catch (error) {
            const errorResult = {
              success: false,
              error: (error as Error).message,
              notificationId: generateNotificationId(),
              userId: user.userId,
            };

            posthog.capture({
              distinctId: user.userId,
              event: "notification_sent",
              properties: {
                ...errorResult,
                type: "weekly",
                source: "notification_router",
              },
            });

            return errorResult;
          }
        }),
      );

      // Track batch results
      posthog.capture({
        distinctId: "system",
        event: "weekly_notifications_batch",
        properties: {
          totalProcessed: usersWithTokens.length,
          successfulNotifications: results.filter((r) => r.success).length,
          failedNotifications: results.filter((r) => !r.success).length,
        },
      });

      return {
        success: true,
        totalProcessed: usersWithTokens.length,
        successfulNotifications: results.filter((r) => r.success).length,
        errors: results
          .filter((r) => !r.success)
          .map((result) => ({
            userId: result.userId,
            error: result.error ?? "Unknown error",
          })),
      };
    }),

  sendTrialExpirationReminders: publicProcedure
    .input(z.object({ cronSecret: z.string() }))
    .mutation(async ({ input }) => {
      // Check if the provided cronSecret matches the environment variable
      if (input.cronSecret !== process.env.CRON_SECRET) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid CRON_SECRET",
        });
      }

      // Calculate the date for users who started their trial 5 days ago
      const fiveBusinessDaysAgo = new Date();
      fiveBusinessDaysAgo.setDate(fiveBusinessDaysAgo.getDate() - 5);
      const targetDate = fiveBusinessDaysAgo.toISOString().split("T")[0];

      // Fetch users who started their trial 3 days ago and haven't cancelled
      const usersWithTokens = await db
        .select({
          userId: pushTokens.userId,
          expoPushToken: pushTokens.expoPushToken,
        })
        .from(pushTokens)
        .innerJoin(
          users,
          sql`${users.id} COLLATE utf8mb4_unicode_ci = ${pushTokens.userId} COLLATE utf8mb4_unicode_ci`,
        )
        .where(
          and(
            sql`${pushTokens.expoPushToken} != 'Error: Must use physical device for push notifications'`,
            sql`JSON_EXTRACT(${users.publicMetadata}, '$.plan.status') = 'trialing'`,
            sql`DATE(JSON_UNQUOTE(JSON_EXTRACT(${users.publicMetadata}, '$.plan.trialStartDate'))) = DATE(${targetDate})`,
          ),
        );

      // Process notifications concurrently
      const results = await Promise.all(
        usersWithTokens.map(async (user) => {
          const notificationId = generateNotificationId();
          try {
            if (!Expo.isExpoPushToken(user.expoPushToken)) {
              return {
                success: false,
                error: "Invalid push token",
                notificationId,
                userId: user.userId,
              };
            }

            const message: ExpoPushMessage = {
              to: user.expoPushToken,
              sound: "default",
              title: "2 days left on your trial",
              body: "Your subscription will change from trial to Soonlist Unlimited soon. Keep capturing your possibilities!",
              data: {
                url: "/settings/subscription",
                notificationId,
              },
            };

            const [ticket] = await expo.sendPushNotificationsAsync([message]);

            posthog.capture({
              distinctId: user.userId,
              event: "notification_sent",
              properties: {
                success: true,
                notificationId,
                type: "trial_expiration",
                source: "notification_router",
                ticketId: getTicketId(ticket),
              },
            });

            return {
              success: true,
              ticket,
              notificationId,
              userId: user.userId,
            };
          } catch (error) {
            posthog.capture({
              distinctId: user.userId,
              event: "notification_sent",
              properties: {
                success: false,
                notificationId,
                type: "trial_expiration",
                error: (error as Error).message,
              },
            });

            return {
              success: false,
              error: (error as Error).message,
              notificationId,
              userId: user.userId,
            };
          }
        }),
      );

      // Track batch results
      posthog.capture({
        distinctId: "system",
        event: "trial_expiration_notifications_batch",
        properties: {
          totalProcessed: usersWithTokens.length,
          successfulNotifications: results.filter((r) => r.success).length,
          failedNotifications: results.filter((r) => !r.success).length,
        },
      });

      return {
        success: true,
        totalProcessed: usersWithTokens.length,
        successfulNotifications: results.filter((r) => r.success).length,
        errors: results
          .filter((r) => !r.success)
          .map((result) => ({
            userId: result.userId,
            error: result.error ?? "Unknown error",
          })),
      };
    }),
});
