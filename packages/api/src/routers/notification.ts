import { TRPCError } from "@trpc/server";
import { and, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@soonlist/db";
import { users } from "@soonlist/db/schema";

import { createTRPCRouter, publicProcedure } from "../trpc";
import { generateNotificationId } from "../utils/notification";
import { sendBatchNotifications, sendNotification } from "../utils/oneSignal";
import { posthog } from "../utils/posthog";
import { createDeepLink } from "../utils/urlScheme";



export const notificationRouter = createTRPCRouter({
  sendMarketingNotification: publicProcedure
    .input(
      z.object({
        cronSecret: z.string(),
        title: z.string(),
        body: z.string(),
        data: z.record(z.unknown()).optional(),
        url: z.string().optional(),
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

      // Fetch all users
      const allUsers = await db
        .select({
          userId: users.id,
        })
        .from(users);

      const userIds = allUsers.map((user) => user.userId);

      // Send batch notification using OneSignal
      const result = await sendBatchNotifications({
        userIds,
        title: input.title,
        body: input.body,
        url: input.url,
        data: input.data,
      });

      // Track batch results
      posthog.capture({
        distinctId: "system",
        event: "marketing_notifications_batch",
        properties: {
          totalProcessed: userIds.length,
          successfulNotifications: result.success ? result.recipients || 0 : 0,
          failedNotifications: result.success ? 0 : userIds.length,
          oneSignalId: result.id,
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
    }),

  sendSingleNotification: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        title: z.string(),
        body: z.string(),
        url: z.string().optional(),
        data: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { userId, title, body, url, data } = input;

      const notificationId = generateNotificationId();

      try {
        const result = await sendNotification({
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

      // Fetch users who started their trial 5 days ago and haven't cancelled
      const trialUsers = await db
        .select({
          userId: users.id,
        })
        .from(users)
        .where(
          and(
            sql`JSON_EXTRACT(${users.publicMetadata}, '$.plan.status') = 'trialing'`,
            sql`DATE(JSON_UNQUOTE(JSON_EXTRACT(${users.publicMetadata}, '$.plan.trialStartDate'))) = DATE(${targetDate})`,
          ),
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
      const userIds = trialUsers.map((user) => user.userId);

      // Send batch notification using OneSignal
      const result = await sendBatchNotifications({
        userIds,
        title: "2 days left on your trial",
        body: "Your subscription will change from trial to Soonlist Unlimited soon. Keep capturing your possibilities!",
        url: createDeepLink("settings/subscription"),
        data: {
          type: "trial_expiration",
        },
      });

      // Track batch results
      posthog.capture({
        distinctId: "system",
        event: "trial_expiration_notifications_batch",
        properties: {
          totalProcessed: userIds.length,
          successfulNotifications: result.success ? result.recipients || 0 : 0,
          failedNotifications: result.success ? 0 : userIds.length,
          oneSignalId: result.id,
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
    }),
});
