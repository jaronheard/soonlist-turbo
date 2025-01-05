import type { ExpoPushMessage } from "expo-server-sdk";
import Expo from "expo-server-sdk";
import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";

import { and, eq, gte, lte } from "@soonlist/db";
import { events as eventsSchema } from "@soonlist/db/schema";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { generateNotificationId } from "../utils/notification";
import { createEventAndNotify, fetchAndProcessEvent } from "./aiHelpers";

const prototypeEventCreateBaseSchema = z.object({
  timezone: z.string(),
  expoPushToken: z.string(),
  comment: z.string().optional(),
  lists: z.array(z.object({ value: z.string() })),
  visibility: z.enum(["public", "private"]).optional(),
  userId: z.string(),
  username: z.string(),
});

const prototypeEventCreateSchema = prototypeEventCreateBaseSchema.extend({
  rawText: z.string(),
});

const prototypeEventCreateFromImageSchema =
  prototypeEventCreateBaseSchema.extend({
    imageUrl: z.string(),
  });

const prototypeEventCreateFromUrlSchema = prototypeEventCreateBaseSchema.extend(
  {
    url: z.string(),
  },
);

// Create a single Expo SDK client to be reused
const expo = new Expo();

function getDayBounds(timezone: string) {
  const now = Temporal.Now.zonedDateTimeISO(timezone);
  const startOfDay = now.startOfDay();
  const endOfDay = now.add({ days: 1 }).startOfDay();

  return {
    start: new Date(startOfDay.epochMilliseconds),
    end: new Date(endOfDay.epochMilliseconds),
  };
}

export const aiRouter = createTRPCRouter({
  eventFromRawText: protectedProcedure
    .input(
      z.object({
        rawText: z.string(),
        timezone: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return fetchAndProcessEvent({
        ctx,
        input,
        fnName: "eventFromRawText",
      });
    }),
  eventsFromUrl: protectedProcedure
    .input(
      z.object({
        url: z.string(),
        timezone: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return fetchAndProcessEvent({
        ctx,
        input,
        fnName: "eventFromUrl",
      });
    }),
  eventFromImage: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string(),
        timezone: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return fetchAndProcessEvent({
        ctx,
        input,
        fnName: "eventFromImage",
      });
    }),
  eventFromRawTextThenCreateThenNotification: publicProcedure
    .input(prototypeEventCreateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { events } = await fetchAndProcessEvent({
          ctx,
          input,
          fnName: "eventFromRawTextThenCreateThenNotification",
        });

        if (
          !events.length ||
          !events[0]?.name ||
          !events[0]?.startDate ||
          !events[0]?.endDate
        ) {
          throw new Error("No valid event found in response");
        }

        const dailyEventsPromise = ctx.db
          .select({
            id: eventsSchema.id,
          })
          .from(eventsSchema)
          .where(
            and(
              eq(eventsSchema.userId, input.userId),
              gte(eventsSchema.createdAt, getDayBounds(input.timezone).start),
              lte(eventsSchema.createdAt, getDayBounds(input.timezone).end),
            ),
          );

        const result = await createEventAndNotify({
          ctx,
          input,
          firstEvent: events[0],
          dailyEventsPromise,
          source: "rawText",
        });

        return result;
      } catch (error) {
        const { expoPushToken } = input;

        const title = "Soonlist";
        const body = "There was an error creating your event.";

        if (!Expo.isExpoPushToken(expoPushToken)) {
          throw new Error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Push token ${expoPushToken} is not a valid Expo push token`,
          );
        }

        const notificationId = generateNotificationId();
        const message: ExpoPushMessage = {
          to: expoPushToken,
          sound: "default",
          title,
          body,
          data: {
            url: "/feed",
            notificationId,
          },
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
            error: (error as Error).message,
          };
        }
      }
    }),
  eventFromUrlThenCreateThenNotification: publicProcedure
    .input(prototypeEventCreateFromUrlSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const dailyEventsPromise = ctx.db
          .select({
            id: eventsSchema.id,
          })
          .from(eventsSchema)
          .where(
            and(
              eq(eventsSchema.userId, input.userId),
              gte(eventsSchema.createdAt, getDayBounds(input.timezone).start),
              lte(eventsSchema.createdAt, getDayBounds(input.timezone).end),
            ),
          );

        const { events } = await fetchAndProcessEvent({
          ctx,
          input,
          fnName: "eventFromUrlThenCreateThenNotification",
        });

        if (
          !events.length ||
          !events[0]?.name ||
          !events[0]?.startDate ||
          !events[0]?.endDate
        ) {
          throw new Error("No valid event found in response");
        }

        const result = await createEventAndNotify({
          ctx,
          input,
          firstEvent: events[0],
          dailyEventsPromise,
          source: "url",
        });

        return result;
      } catch (error) {
        const { expoPushToken } = input;

        const title = "Soonlist";
        const body = "There was an error creating your event.";

        if (!Expo.isExpoPushToken(expoPushToken)) {
          throw new Error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Push token ${expoPushToken} is not a valid Expo push token`,
          );
        }

        const notificationId = generateNotificationId();
        const message: ExpoPushMessage = {
          to: expoPushToken,
          sound: "default",
          title,
          body,
          data: {
            url: "/feed",
            notificationId,
          },
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
            error: (error as Error).message,
          };
        }
      }
    }),
  eventFromImageThenCreateThenNotification: publicProcedure
    .input(prototypeEventCreateFromImageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const dailyEventsPromise = ctx.db
          .select({
            id: eventsSchema.id,
          })
          .from(eventsSchema)
          .where(
            and(
              eq(eventsSchema.userId, input.userId),
              gte(eventsSchema.createdAt, getDayBounds(input.timezone).start),
              lte(eventsSchema.createdAt, getDayBounds(input.timezone).end),
            ),
          );

        const { events } = await fetchAndProcessEvent({
          ctx,
          input,
          fnName: "eventFromImageThenCreateThenNotification",
        });

        if (
          !events.length ||
          !events[0]?.name ||
          !events[0]?.startDate ||
          !events[0]?.endDate
        ) {
          throw new Error("No valid event found in response");
        }

        const result = await createEventAndNotify({
          ctx,
          input,
          firstEvent: {
            ...events[0],
            images: [
              input.imageUrl,
              input.imageUrl,
              input.imageUrl,
              input.imageUrl,
            ],
          },
          dailyEventsPromise,
          source: "image",
        });

        return result;
      } catch (error) {
        const { expoPushToken } = input;

        const title = "Soonlist";
        const body = "There was an error creating your event.";

        if (!Expo.isExpoPushToken(expoPushToken)) {
          throw new Error(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Push token ${expoPushToken} is not a valid Expo push token`,
          );
        }

        const notificationId = generateNotificationId();
        const message: ExpoPushMessage = {
          to: expoPushToken,
          sound: "default",
          title,
          body,
          data: {
            url: "/feed",
            notificationId,
          },
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
            error: (error as Error).message,
          };
        }
      }
    }),
});
