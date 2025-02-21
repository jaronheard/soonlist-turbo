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
import { getDayBounds } from "../utils/date";
import { sendNotificationToAllUserTokens } from "../utils/notification";
import {
  createEventAndNotify,
  fetchAndProcessEvent,
  validateFirstEvent,
} from "./aiHelpers";

const prototypeEventCreateBaseSchema = z.object({
  timezone: z.string(),
  expoPushToken: z.string().optional(),
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

          // Send error notification to all user tokens
          const result = await sendNotificationToAllUserTokens({
            userId: input.userId,
            title: "Soonlist",
            subtitle: "",
            body: "There was an error creating your event.",
            url: "/feed",
          });

          return {
            success: true,
            ticket: result.tickets?.[0],
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

          // Send error notification to all user tokens
          const result = await sendNotificationToAllUserTokens({
            userId: input.userId,
            title: "Soonlist",
            subtitle: "",
            body: "There was an error creating your event.",
            url: "/feed",
          });

          return {
            success: true,
            ticket: result.tickets?.[0],
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

          // Send error notification to all user tokens
          const result = await sendNotificationToAllUserTokens({
            userId: input.userId,
            title: "Soonlist",
            subtitle: "",
            body: "There was an error creating your event.",
            url: "/feed",
          });

          return {
            success: true,
            ticket: result.tickets?.[0],
          };
        }
      },
    ),
});
