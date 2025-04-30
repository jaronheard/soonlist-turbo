import { Temporal } from "@js-temporal/polyfill";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, eq, gte, lte } from "@soonlist/db";
import { events as eventsSchema } from "@soonlist/db/schema";

import type {
  AIErrorResponse,
  AIEventResponse,
  ProcessedEventResponse,
} from "./aiHelpers";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { sendNotification } from "../utils/oneSignal";
import { createDeepLink } from "../utils/urlScheme";
import {
  createEvent,
  createEventAndNotify,
  fetchAndProcessEvent,
  uploadImageToCDNFromBase64,
  validateFirstEvent,
} from "./aiHelpers";

const prototypeEventCreateBaseSchema = z.object({
  timezone: z.string(),
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

const prototypeEventCreateFromBase64Schema =
  prototypeEventCreateBaseSchema.extend({
    // require at least 1 byte, cap around 500 KB (≈670 KB once base64-encoded)
    base64Image: z
      .string()
      .min(1, "Image data missing")
      .max(700_000, "Image exceeds size limit"),
  });

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
    .query(async ({ ctx, input }): Promise<ProcessedEventResponse> => {
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
    .mutation(
      async ({ ctx, input }): Promise<AIEventResponse | AIErrorResponse> => {
        try {
          const { events } = await fetchAndProcessEvent({
            ctx,
            input,
            fnName: "eventFromRawTextThenCreateThenNotification",
          });

          const validatedEvent = validateFirstEvent(events);

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
            firstEvent: validatedEvent,
            dailyEventsPromise,
            source: "rawText",
          });

          return result;
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }

          const { userId } = input;

          // Send error notification using OneSignal
          const notificationId = crypto.randomUUID();
          const notificationResult = await sendNotification({
            userId,
            title: "Soonlist",
            body: "There was an error creating your event.",
            url: createDeepLink("feed"),
            data: {
              notificationId,
            },
            source: "ai_router",
            method: "rawText",
          });

          return {
            success: notificationResult.success,
            id: notificationResult.id,
            error: notificationResult.error,
          };
        }
      },
    ),
  eventFromUrlThenCreateThenNotification: publicProcedure
    .input(prototypeEventCreateFromUrlSchema)
    .mutation(
      async ({ ctx, input }): Promise<AIEventResponse | AIErrorResponse> => {
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

          const validatedEvent = validateFirstEvent(events);

          const result = await createEventAndNotify({
            ctx,
            input,
            firstEvent: validatedEvent,
            dailyEventsPromise,
            source: "url",
          });

          return result;
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }

          const { userId } = input;

          // Send error notification using OneSignal
          const notificationId = crypto.randomUUID();
          const notificationResult = await sendNotification({
            userId,
            title: "Soonlist",
            body: "There was an error creating your event.",
            url: createDeepLink("feed"),
            data: {
              notificationId,
            },
            source: "ai_router",
            method: "url",
          });

          return {
            success: notificationResult.success,
            id: notificationResult.id,
            error: notificationResult.error,
          };
        }
      },
    ),
  eventFromImageThenCreateThenNotification: publicProcedure
    .input(prototypeEventCreateFromImageSchema)
    .mutation(
      async ({ ctx, input }): Promise<AIEventResponse | AIErrorResponse> => {
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

          const validatedEvent = validateFirstEvent(events);

          const result = await createEventAndNotify({
            ctx,
            input,
            firstEvent: validatedEvent,
            dailyEventsPromise,
            source: "image",
          });

          return result;
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }

          const { userId } = input;

          // Send error notification using OneSignal
          const notificationId = crypto.randomUUID();
          const notificationResult = await sendNotification({
            userId,
            title: "Soonlist",
            body: "There was an error creating your event.",
            url: createDeepLink("feed"),
            data: {
              notificationId,
            },
            source: "ai_router",
            method: "image",
          });

          return {
            success: notificationResult.success,
            id: notificationResult.id,
            error: notificationResult.error,
          };
        }
      },
    ),
  eventFromImageBase64ThenCreate: publicProcedure
    .input(prototypeEventCreateFromBase64Schema)
    .mutation(async ({ ctx, input }): Promise<AIEventResponse> => {
      try {
        // Start AI processing and image upload in parallel
        const [aiResult, uploadResult] = await Promise.allSettled([
          fetchAndProcessEvent({
            ctx,
            input,
            fnName: "eventFromImageBase64ThenCreate",
          }),
          uploadImageToCDNFromBase64(input.base64Image), // Upload the base64 image
        ]);

        // Handle AI processing result
        if (aiResult.status === "rejected") {
          console.error("AI Processing failed:", aiResult.reason);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to process event data from image.",
            cause: aiResult.reason,
          });
        }
        const { events } = aiResult.value;
        const validatedEvent = validateFirstEvent(events);

        // Handle image upload result (log error but don't fail the request)
        let uploadedImageUrl: string | null = null;
        if (uploadResult.status === "fulfilled") {
          uploadedImageUrl = uploadResult.value;
        } else {
          // Log the upload error but continue
          console.error("Image upload failed:", uploadResult.reason);
          // Consider logging this error more formally (Sentry, etc.)
        }

        // Fetch daily events count (can potentially run earlier if needed)
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

        // Create the event, passing the potentially null uploadedImageUrl
        const result = await createEvent({
          ctx,
          input,
          firstEvent: validatedEvent,
          dailyEventsPromise,
          source: "image",
          uploadedImageUrl: uploadedImageUrl, // Pass the URL to createEvent
        });

        return result;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),
});
