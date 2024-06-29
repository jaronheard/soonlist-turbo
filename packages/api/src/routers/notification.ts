import type { ExpoPushMessage } from "expo-server-sdk";
import { Expo } from "expo-server-sdk";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";

// Create a single Expo SDK client to be reused
const expo = new Expo();

// Define the input schema for the sendNotification procedure
const sendNotificationInputSchema = z.object({
  expoPushToken: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()).optional(),
});

export const notificationRouter = createTRPCRouter({
  sendSingleNotification: publicProcedure
    .input(sendNotificationInputSchema)
    .mutation(async ({ input }) => {
      const { expoPushToken, title, body, data } = input;

      if (!Expo.isExpoPushToken(expoPushToken)) {
        throw new Error(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `Push token ${expoPushToken} is not a valid Expo push token`,
        );
      }

      const message: ExpoPushMessage = {
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data,
      };

      try {
        const [ticket] = await expo.sendPushNotificationsAsync([message]);
        return {
          success: true,
          ticket,
        };
      } catch (error) {
        console.error("Error sending notification:", error);
        return {
          success: false,
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          error: (error as Error).message,
        };
      }
    }),
});
