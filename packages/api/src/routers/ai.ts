import type { ExpoPushMessage } from "expo-server-sdk";
import Expo from "expo-server-sdk";
import { openai } from "@ai-sdk/openai";
import { Temporal } from "@js-temporal/polyfill";
import { TRPCError } from "@trpc/server";
import { waitUntil } from "@vercel/functions";
import { generateObject } from "ai";
import { Langfuse } from "langfuse";
import SuperJSON from "superjson";
import { z } from "zod";

import type { NewComment, NewEvent, NewEventToLists } from "@soonlist/db/types";
import {
  addCommonAddToCalendarProps,
  EventMetadataSchema,
  EventSchema,
  getPrompt,
  getSystemMessage,
  getSystemMessageMetadata,
} from "@soonlist/cal";
import { and, eq, gte, lte } from "@soonlist/db";
import {
  comments,
  events as eventsSchema,
  eventToLists,
} from "@soonlist/db/schema";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { generatePublicId } from "../utils";
import { getTicketId } from "../utils/expo";
import { generateNotificationId } from "../utils/notification";
import { posthog } from "../utils/posthog";

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
  secretKey: process.env.LANGFUSE_SECRET_KEY || "",
  baseUrl: process.env.LANGFUSE_BASE_URL || "",
});

const MODEL = "gpt-4o";

const prototypeEventCreateSchema = z.object({
  rawText: z.string(),
  timezone: z.string(),
  expoPushToken: z.string(),
  comment: z.string().optional(),
  lists: z.array(z.record(z.string().trim())),
  visibility: z.enum(["public", "private"]).optional(),
  userId: z.string(),
  username: z.string(),
});

const prototypeEventCreateFromImageSchema = z.object({
  imageUrl: z.string(),
  timezone: z.string(),
  expoPushToken: z.string(),
  comment: z.string().optional(),
  lists: z.array(z.record(z.string().trim())),
  visibility: z.enum(["public", "private"]).optional(),
  userId: z.string(),
  username: z.string(),
});

const prototypeEventCreateFromUrlSchema = z.object({
  url: z.string(),
  timezone: z.string(),
  expoPushToken: z.string(),
  comment: z.string().optional(),
  lists: z.array(z.record(z.string().trim())),
  visibility: z.enum(["public", "private"]).optional(),
  userId: z.string(),
  username: z.string(),
});

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

function getNotificationContent(eventName: string, count: number) {
  if (count === 1) {
    return {
      title: "Event captured ✨",
      body: "First capture today! 🤔 What's next?",
      subtitle: eventName,
    };
  } else if (count === 2) {
    return {
      title: "Event captured ✨",
      body: "2 captures today! ✌️ Keep 'em coming!",
      subtitle: eventName,
    };
  } else if (count === 3) {
    return {
      title: "Event captured ✨",
      body: "3 captures today! 🔥 You're on fire!",
      subtitle: eventName,
    };
  } else {
    return {
      title: "Event captured ✨",
      body: `${count} captures today! 🌌 The sky's the limit!`,
      subtitle: eventName,
    };
  }
}

// Add this near the top of the file with other constants
const JINA_API_URL = "https://r.jina.ai";

export const aiRouter = createTRPCRouter({
  eventFromRawText: protectedProcedure
    .input(
      z.object({
        rawText: z.string(),
        timezone: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const system = getSystemMessage();
      const systemMetadata = getSystemMessageMetadata();
      const prompt = getPrompt(input.timezone);

      // START - duplicated except for input with eventFromImage
      const generateObjectWithLogging = async <T>(
        generateObjectOptions: Parameters<typeof generateObject<T>>[0],
        loggingOptions: { name: string },
      ): Promise<ReturnType<typeof generateObject<T>>> => {
        const trace = langfuse.trace({
          name: loggingOptions.name,
          sessionId: ctx.auth.sessionId,
          userId: ctx.auth.userId,
          input: input.rawText,
          version: prompt.version,
        });
        const generation = trace.generation({
          name: "generation",
          input: input.rawText,
          model: MODEL,
          version: prompt.version,
        });
        generation.update({
          completionStartTime: new Date(),
        });
        try {
          const result = await generateObject(generateObjectOptions);
          generation.end({
            output: result.object,
          });
          generation.score({
            name: "eventToJson",
            value: result.object === null ? 0 : 1,
          });
          trace.update({
            output: result.object,
            metadata: {
              finishReason: result.finishReason,
              logprobs: result.logprobs,
              rawResponse: result.rawResponse,
              warnings: result.warnings,
            },
          });
          waitUntil(langfuse.flushAsync());
          return result;
        } catch (error) {
          console.error(
            "An error occurred while generating the response:",
            error,
          );
          generation.score({
            name: "eventToJson",
            value: 0,
          });
          trace.update({
            output: null,
            metadata: {
              finishReason: "error",
              error: error,
            },
          });
          waitUntil(langfuse.flushAsync());
          throw error;
        }
      };
      // END - duplicated except for input with eventFromImage

      const [event, metadata] = await Promise.all([
        generateObjectWithLogging(
          {
            model: openai(MODEL),
            mode: "json",
            temperature: 0.2,
            maxRetries: 0,
            messages: [
              { role: "system", content: system.text },
              {
                role: "user",
                content: `${prompt.text} Input: """
              ${input.rawText}
              """`,
              },
            ],
            schema: EventSchema,
          },
          { name: "eventFromRawText.event" },
        ),
        generateObjectWithLogging(
          {
            model: openai(MODEL),
            mode: "json",
            temperature: 0.2,
            maxRetries: 0,
            messages: [
              { role: "system", content: systemMetadata.text },
              {
                role: "user",
                content: `${prompt.textMetadata} Input: """
              ${input.rawText}
              """`,
              },
            ],
            schema: EventMetadataSchema,
          },
          { name: "eventFromRawText.metadata" },
        ),
      ]);

      const eventObject = { ...event.object, eventMetadata: metadata.object };

      const events = addCommonAddToCalendarProps([eventObject]);
      const response = `${event.rawResponse?.toString() || ""} ${metadata.rawResponse?.toString()}`;
      return { events, response };
    }),
  eventsFromUrl: protectedProcedure
    .input(
      z.object({
        url: z.string(),
        timezone: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const system = getSystemMessage();
      const systemMetadata = getSystemMessageMetadata();
      const prompt = getPrompt(input.timezone);

      // START - duplicated except for input with eventFromImage
      const generateObjectWithLogging = async <T>(
        generateObjectOptions: Parameters<typeof generateObject<T>>[0],
        loggingOptions: { name: string },
      ): Promise<ReturnType<typeof generateObject<T>>> => {
        const trace = langfuse.trace({
          name: loggingOptions.name,
          sessionId: ctx.auth.sessionId,
          userId: ctx.auth.userId,
          input: input.url,
          version: prompt.version,
        });
        const generation = trace.generation({
          name: "generation",
          input: input.url,
          model: MODEL,
          version: prompt.version,
        });
        generation.update({
          completionStartTime: new Date(),
        });
        try {
          const result = await generateObject(generateObjectOptions);
          generation.end({
            output: result.object,
          });
          generation.score({
            name: "eventToJson",
            value: result.object === null ? 0 : 1,
          });
          trace.update({
            output: result.object,
            metadata: {
              finishReason: result.finishReason,
              logprobs: result.logprobs,
              rawResponse: result.rawResponse,
              warnings: result.warnings,
            },
          });
          waitUntil(langfuse.flushAsync());
          return result;
        } catch (error) {
          console.error(
            "An error occurred while generating the response:",
            error,
          );
          generation.score({
            name: "eventToJson",
            value: 0,
          });
          trace.update({
            output: null,
            metadata: {
              finishReason: "error",
              error: error,
            },
          });
          waitUntil(langfuse.flushAsync());
          throw error;
        }
      };
      // END - duplicated except for input with eventFromImage
      const jinaReader = await fetch(`https://r.jina.ai/${input.url}`, {
        method: "GET",
      });
      const rawText = await jinaReader.text();
      if (!rawText) {
        throw new Error("Failed to fetch the text from the URL.");
      }

      const [event, metadata] = await Promise.all([
        generateObjectWithLogging(
          {
            model: openai(MODEL),
            mode: "json",
            temperature: 0.2,
            maxRetries: 0,
            messages: [
              { role: "system", content: system.text },
              {
                role: "user",
                content: `${prompt.text} Input: """
              ${rawText}
              """`,
              },
            ],
            schema: EventSchema,
          },
          { name: "eventFromUrl.event" },
        ),
        generateObjectWithLogging(
          {
            model: openai(MODEL),
            mode: "json",
            temperature: 0.2,
            maxRetries: 0,
            messages: [
              { role: "system", content: systemMetadata.text },
              {
                role: "user",
                content: `${prompt.textMetadata} Input: """
              ${rawText}
              """`,
              },
            ],
            schema: EventMetadataSchema,
          },
          { name: "eventFromUrl.metadata" },
        ),
      ]);

      const eventObject = { ...event.object, eventMetadata: metadata.object };

      const events = addCommonAddToCalendarProps([eventObject]);
      const response = `${event.rawResponse?.toString() || ""} ${metadata.rawResponse?.toString()}`;
      return { events, response };
    }),
  eventFromImage: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string(),
        timezone: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const system = getSystemMessage();
      const systemMetadata = getSystemMessageMetadata();
      const prompt = getPrompt(input.timezone);

      // START - duplicated except for input with eventFromRawText
      const generateObjectWithLogging = async <T>(
        generateObjectOptions: Parameters<typeof generateObject<T>>[0],
        loggingOptions: { name: string },
      ): Promise<ReturnType<typeof generateObject<T>>> => {
        const trace = langfuse.trace({
          name: loggingOptions.name,
          sessionId: ctx.auth.sessionId,
          userId: ctx.auth.userId,
          input: input.imageUrl,
          version: prompt.version,
        });
        const generation = trace.generation({
          name: "generation",
          input: input.imageUrl,
          model: MODEL,
          version: prompt.version,
        });
        generation.update({
          completionStartTime: new Date(),
        });
        try {
          const result = await generateObject(generateObjectOptions);
          generation.end({
            output: result.object,
          });
          generation.score({
            name: "eventToJson",
            value: result.object === null ? 0 : 1,
            comment: "Untested",
          });
          trace.update({
            output: result.object,
            metadata: {
              finishReason: result.finishReason,
              logprobs: result.logprobs,
              rawResponse: result.rawResponse,
              warnings: result.warnings,
            },
          });
          waitUntil(langfuse.flushAsync());
          return result;
        } catch (error) {
          console.error(
            "An error occurred while generating the response:",
            error,
          );
          generation.score({
            name: "eventToJson",
            value: 0,
          });
          trace.update({
            output: null,
            metadata: {
              finishReason: "error",
              error: error,
            },
          });
          waitUntil(langfuse.flushAsync());
          throw error;
        }
      };
      // END - duplicated except for input with eventFromRawText

      const [event, metadata] = await Promise.all([
        generateObjectWithLogging(
          {
            model: openai(MODEL),
            mode: "json",
            temperature: 0.2,
            maxRetries: 0,
            messages: [
              { role: "system", content: system.text },
              {
                role: "user",
                content: prompt.text,
              },
              {
                role: "user",
                content: [
                  {
                    type: "image",
                    image: new URL(input.imageUrl),
                  },
                ],
              },
            ],
            schema: EventSchema,
          },
          { name: "eventFromImage.event" },
        ),
        generateObjectWithLogging(
          {
            model: openai(MODEL),
            mode: "json",
            temperature: 0.2,
            maxRetries: 0,
            messages: [
              { role: "system", content: systemMetadata.text },
              {
                role: "user",
                content: prompt.textMetadata,
              },
              {
                role: "user",
                content: [
                  {
                    type: "image",
                    image: new URL(input.imageUrl),
                  },
                ],
              },
            ],
            schema: EventMetadataSchema,
          },
          { name: "eventFromImage.metadata" },
        ),
      ]);

      const eventObject = { ...event.object, eventMetadata: metadata.object };

      const events = addCommonAddToCalendarProps([eventObject]);
      const response = `${event.rawResponse?.toString() || ""} ${metadata.rawResponse?.toString()}`;
      return { events, response };
    }),
  eventFromRawTextThenCreateThenNotification: publicProcedure
    .input(prototypeEventCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const system = getSystemMessage();
      const systemMetadata = getSystemMessageMetadata();
      const prompt = getPrompt(input.timezone);

      console.log("input", SuperJSON.stringify(input));

      // START - duplicated except for input with eventFromImage
      const generateObjectWithLogging = async <T>(
        generateObjectOptions: Parameters<typeof generateObject<T>>[0],
        loggingOptions: { name: string },
      ): Promise<ReturnType<typeof generateObject<T>>> => {
        const trace = langfuse.trace({
          name: loggingOptions.name,
          sessionId: ctx.auth.sessionId,
          userId: ctx.auth.userId,
          input: input.rawText,
          version: prompt.version,
        });
        const generation = trace.generation({
          name: "generation",
          input: input.rawText,
          model: MODEL,
          version: prompt.version,
        });
        generation.update({
          completionStartTime: new Date(),
        });
        try {
          const result = await generateObject(generateObjectOptions);
          generation.end({
            output: result.object,
          });
          generation.score({
            name: "eventToJson",
            value: result.object === null ? 0 : 1,
          });
          trace.update({
            output: result.object,
            metadata: {
              finishReason: result.finishReason,
              logprobs: result.logprobs,
              rawResponse: result.rawResponse,
              warnings: result.warnings,
            },
          });
          waitUntil(langfuse.flushAsync());
          return result;
        } catch (error) {
          console.error(
            "An error occurred while generating the response:",
            error,
          );
          generation.score({
            name: "eventToJson",
            value: 0,
          });
          trace.update({
            output: null,
            metadata: {
              finishReason: "error",
              error: error,
            },
          });
          waitUntil(langfuse.flushAsync());
          throw error;
        }
      };
      try {
        // END - duplicated except for input with eventFromImage
        const [event, metadata] = await Promise.all([
          generateObjectWithLogging(
            {
              model: openai(MODEL),
              mode: "json",
              temperature: 0.2,
              maxRetries: 0,
              messages: [
                { role: "system", content: system.text },
                {
                  role: "user",
                  content: `${prompt.text} Input: """
              ${input.rawText}
              """`,
                },
              ],
              schema: EventSchema,
            },
            { name: "eventFromRawText.event" },
          ),
          generateObjectWithLogging(
            {
              model: openai(MODEL),
              mode: "json",
              temperature: 0.2,
              maxRetries: 0,
              messages: [
                { role: "system", content: systemMetadata.text },
                {
                  role: "user",
                  content: `${prompt.textMetadata} Input: """
              ${input.rawText}
              """`,
                },
              ],
              schema: EventMetadataSchema,
            },
            { name: "eventFromRawText.metadata" },
          ),
        ]);

        const eventObject = { ...event.object, eventMetadata: metadata.object };

        const events = addCommonAddToCalendarProps([eventObject]);
        // const response = `${event.rawResponse?.toString() || ""} ${metadata.rawResponse?.toString()}`;
        // return { events, response };

        // adapted logic from event.create
        const userId = input.userId;
        const username = input.username;
        if (!userId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No user id found in session",
          });
        }

        if (!username) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No username found in session",
          });
        }

        const firstEvent = events[0];
        if (!firstEvent) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No events found in response",
          });
        }

        const hasComment = input.comment && input.comment.length > 0;
        const hasLists = input.lists.length > 0;
        const hasVisibility = input.visibility && input.visibility.length > 0;

        let startTime = firstEvent.startTime;
        let endTime = firstEvent.endTime;
        let timeZone = firstEvent.timeZone;

        // time zone is America/Los_Angeles if not specified
        if (!timeZone) {
          timeZone = "America/Los_Angeles";
        }

        // start time is 00:00 if not specified
        if (!startTime) {
          startTime = "00:00";
        }
        // end time is 23:59 if not specified
        if (!endTime) {
          endTime = "23:59";
        }

        const start = Temporal.ZonedDateTime.from(
          `${firstEvent.startDate}T${startTime}[${timeZone}]`,
        );
        const end = Temporal.ZonedDateTime.from(
          `${firstEvent.endDate}T${endTime}[${timeZone}]`,
        );
        const startUtcDate = new Date(start.epochMilliseconds);
        const endUtcDate = new Date(end.epochMilliseconds);
        const eventid = generatePublicId();

        const values = {
          id: eventid,
          userId: userId,
          userName: username || "unknown",
          event: firstEvent,
          eventMetadata: firstEvent.eventMetadata,
          startDateTime: startUtcDate,
          endDateTime: endUtcDate,
          ...(hasVisibility && {
            visibility: input.visibility,
          }),
        };
        const createEvent = await ctx.db
          .transaction(async (tx) => {
            const insertEvent = async (event: NewEvent) => {
              return tx.insert(eventsSchema).values(event);
            };
            const insertComment = async (comment: NewComment) => {
              return tx.insert(comments).values(comment);
            };
            const insertEventToLists = async (
              eventToList: NewEventToLists[],
            ) => {
              return tx.insert(eventToLists).values(eventToList);
            };

            await insertEvent(values);
            if (hasComment) {
              await insertComment({
                eventId: eventid,
                content: input.comment || "",
                userId: userId,
              });
            } else {
              // no need to insert comment if there is no comment
            }
            if (hasLists) {
              await tx
                .delete(eventToLists)
                .where(eq(eventToLists.eventId, eventid));
              await insertEventToLists(
                input.lists.map((list) => ({
                  eventId: eventid,
                  listId: list.value!,
                })),
              );
            } else {
              // no need to insert event to list if there is no list
            }
          })
          .then(() => ({ id: eventid }));
        console.log("createEvent", createEvent);
        const { expoPushToken } = input;

        // Get daily event count (non-blocking)
        const dailyEventsPromise = ctx.db
          .select()
          .from(eventsSchema)
          .where(
            and(
              eq(eventsSchema.userId, input.userId),
              gte(eventsSchema.createdAt, getDayBounds(input.timezone).start),
              lte(eventsSchema.createdAt, getDayBounds(input.timezone).end),
            ),
          );

        const dailyEvents = await dailyEventsPromise;
        const eventCount = dailyEvents.length;

        const { title, subtitle, body } = getNotificationContent(
          firstEvent.name,
          eventCount,
        );
        const notificationId = generateNotificationId();
        const message: ExpoPushMessage = {
          to: expoPushToken,
          sound: "default",
          title,
          subtitle,
          body,
          data: {
            url: `/event/${createEvent.id}`,
            notificationId,
          },
        };

        try {
          const [ticket] = await expo.sendPushNotificationsAsync([message]);

          posthog.capture({
            distinctId: input.userId,
            event: "notification_sent",
            properties: {
              success: true,
              notificationId,
              type: "event_creation",
              eventId: createEvent.id,
              title: title,
              source: "ai_router",
              method: "rawText",
              ticketId: getTicketId(ticket),
            },
          });

          return {
            success: true,
            ticket,
            eventId: createEvent.id,
          };
        } catch (error) {
          console.error("Error sending notification:", error);
          return {
            success: false,
            error: (error as Error).message,
          };
        }
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
      const system = getSystemMessage();
      const systemMetadata = getSystemMessageMetadata();
      const prompt = getPrompt(input.timezone);

      console.log("input", SuperJSON.stringify(input));

      const generateObjectWithLogging = async <T>(
        generateObjectOptions: Parameters<typeof generateObject<T>>[0],
        loggingOptions: { name: string },
      ): Promise<ReturnType<typeof generateObject<T>>> => {
        const trace = langfuse.trace({
          name: loggingOptions.name,
          sessionId: ctx.auth.sessionId,
          userId: ctx.auth.userId,
          input: input.url,
          version: prompt.version,
        });
        const generation = trace.generation({
          name: "generation",
          input: input.url,
          model: MODEL,
          version: prompt.version,
        });
        generation.update({
          completionStartTime: new Date(),
        });
        try {
          const result = await generateObject(generateObjectOptions);
          generation.end({
            output: result.object,
          });
          generation.score({
            name: "eventToJson",
            value: result.object === null ? 0 : 1,
          });
          trace.update({
            output: result.object,
            metadata: {
              finishReason: result.finishReason,
              logprobs: result.logprobs,
              rawResponse: result.rawResponse,
              warnings: result.warnings,
            },
          });
          waitUntil(langfuse.flushAsync());
          return result;
        } catch (error) {
          console.error(
            "An error occurred while generating the response:",
            error,
          );
          generation.score({
            name: "eventToJson",
            value: 0,
          });
          trace.update({
            output: null,
            metadata: {
              finishReason: "error",
              error: error,
            },
          });
          waitUntil(langfuse.flushAsync());
          throw error;
        }
      };

      try {
        // Get daily event count (non-blocking)
        const dailyEventsPromise = ctx.db
          .select()
          .from(eventsSchema)
          .where(
            and(
              eq(eventsSchema.userId, input.userId),
              gte(eventsSchema.createdAt, getDayBounds(input.timezone).start),
              lte(eventsSchema.createdAt, getDayBounds(input.timezone).end),
            ),
          );

        // Extract content from URL before AI processing
        const jinaResponse = await fetch(`${JINA_API_URL}/${input.url}`);
        if (!jinaResponse.ok) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch content from URL",
          });
        }
        const rawText = await jinaResponse.text();
        if (!rawText) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No content found at URL",
          });
        }

        const [event, metadata] = await Promise.all([
          generateObjectWithLogging(
            {
              model: openai(MODEL),
              mode: "json",
              temperature: 0.2,
              maxRetries: 0,
              messages: [
                { role: "system", content: system.text },
                {
                  role: "user",
                  content: `${prompt.text} Input: """
              ${rawText}
              """`,
                },
              ],
              schema: EventSchema,
            },
            { name: "eventFromUrl.event" },
          ),
          generateObjectWithLogging(
            {
              model: openai(MODEL),
              mode: "json",
              temperature: 0.2,
              maxRetries: 0,
              messages: [
                { role: "system", content: systemMetadata.text },
                {
                  role: "user",
                  content: `${prompt.textMetadata} Input: """
              ${rawText}
              """`,
                },
              ],
              schema: EventMetadataSchema,
            },
            { name: "eventFromUrl.metadata" },
          ),
        ]);

        const eventObject = { ...event.object, eventMetadata: metadata.object };

        const events = addCommonAddToCalendarProps([eventObject]);

        // Create the event
        const userId = input.userId;
        const username = input.username;
        if (!userId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No user id found in session",
          });
        }

        if (!username) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No username found in session",
          });
        }

        const firstEvent = events[0];
        if (!firstEvent) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No events found in response",
          });
        }

        const hasComment = input.comment && input.comment.length > 0;
        const hasLists = input.lists.length > 0;
        const hasVisibility = input.visibility && input.visibility.length > 0;

        let startTime = firstEvent.startTime;
        let endTime = firstEvent.endTime;
        let timeZone = firstEvent.timeZone;

        // time zone is America/Los_Angeles if not specified
        if (!timeZone) {
          timeZone = "America/Los_Angeles";
        }

        // start time is 00:00 if not specified
        if (!startTime) {
          startTime = "00:00";
        }
        // end time is 23:59 if not specified
        if (!endTime) {
          endTime = "23:59";
        }

        const start = Temporal.ZonedDateTime.from(
          `${firstEvent.startDate}T${startTime}[${timeZone}]`,
        );
        const end = Temporal.ZonedDateTime.from(
          `${firstEvent.endDate}T${endTime}[${timeZone}]`,
        );
        const startUtcDate = new Date(start.epochMilliseconds);
        const endUtcDate = new Date(end.epochMilliseconds);
        const eventid = generatePublicId();

        const values = {
          id: eventid,
          userId: userId,
          userName: username || "unknown",
          event: firstEvent,
          eventMetadata: firstEvent.eventMetadata,
          startDateTime: startUtcDate,
          endDateTime: endUtcDate,
          ...(hasVisibility && {
            visibility: input.visibility,
          }),
        };
        const createEvent = await ctx.db
          .transaction(async (tx) => {
            const insertEvent = async (event: NewEvent) => {
              return tx.insert(eventsSchema).values(event);
            };
            const insertComment = async (comment: NewComment) => {
              return tx.insert(comments).values(comment);
            };
            const insertEventToLists = async (
              eventToList: NewEventToLists[],
            ) => {
              return tx.insert(eventToLists).values(eventToList);
            };

            await insertEvent(values);
            if (hasComment) {
              await insertComment({
                eventId: eventid,
                content: input.comment || "",
                userId: userId,
              });
            } else {
              // no need to insert comment if there is no comment
            }
            if (hasLists) {
              await tx
                .delete(eventToLists)
                .where(eq(eventToLists.eventId, eventid));
              await insertEventToLists(
                input.lists.map((list) => ({
                  eventId: eventid,
                  listId: list.value!,
                })),
              );
            } else {
              // no need to insert event to list if there is no list
            }
          })
          .then(() => ({ id: eventid }));
        console.log("createEvent", createEvent);
        const { expoPushToken } = input;

        // Get daily event count (non-blocking)
        const dailyEvents = await dailyEventsPromise;
        const eventCount = dailyEvents.length;

        const { title, subtitle, body } = getNotificationContent(
          firstEvent.name,
          eventCount,
        );
        const notificationId = generateNotificationId();
        const message: ExpoPushMessage = {
          to: expoPushToken,
          sound: "default",
          title,
          subtitle,
          body,
          data: {
            url: `/event/${createEvent.id}`,
            notificationId,
          },
        };

        try {
          const [ticket] = await expo.sendPushNotificationsAsync([message]);

          posthog.capture({
            distinctId: input.userId,
            event: "notification_sent",
            properties: {
              success: true,
              notificationId,
              type: "event_creation",
              eventId: createEvent.id,
              title: title,
              source: "ai_router",
              method: "url",
              ticketId: getTicketId(ticket),
            },
          });

          return {
            success: true,
            ticket,
            eventId: createEvent.id,
          };
        } catch (error) {
          console.error("Error sending notification:", error);
          return {
            success: false,
            error: (error as Error).message,
          };
        }
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
      const system = getSystemMessage();
      const systemMetadata = getSystemMessageMetadata();
      const prompt = getPrompt(input.timezone);

      console.log("input", SuperJSON.stringify(input));

      // Reuse the generateObjectWithLogging function
      const generateObjectWithLogging = async <T>(
        generateObjectOptions: Parameters<typeof generateObject<T>>[0],
        loggingOptions: { name: string },
      ): Promise<ReturnType<typeof generateObject<T>>> => {
        const trace = langfuse.trace({
          name: loggingOptions.name,
          sessionId: ctx.auth.sessionId,
          userId: ctx.auth.userId,
          input: input.imageUrl,
          version: prompt.version,
        });
        const generation = trace.generation({
          name: "generation",
          input: input.imageUrl,
          model: MODEL,
          version: prompt.version,
        });
        generation.update({
          completionStartTime: new Date(),
        });
        try {
          const result = await generateObject(generateObjectOptions);
          generation.end({
            output: result.object,
          });
          generation.score({
            name: "eventToJson",
            value: result.object === null ? 0 : 1,
            comment: "Untested",
          });
          trace.update({
            output: result.object,
            metadata: {
              finishReason: result.finishReason,
              logprobs: result.logprobs,
              rawResponse: result.rawResponse,
              warnings: result.warnings,
            },
          });
          waitUntil(langfuse.flushAsync());
          return result;
        } catch (error) {
          console.error(
            "An error occurred while generating the response:",
            error,
          );
          generation.score({
            name: "eventToJson",
            value: 0,
          });
          trace.update({
            output: null,
            metadata: {
              finishReason: "error",
              error: error,
            },
          });
          waitUntil(langfuse.flushAsync());
          throw error;
        }
      };

      try {
        // Get daily event count (non-blocking)
        const dailyEventsPromise = ctx.db
          .select()
          .from(eventsSchema)
          .where(
            and(
              eq(eventsSchema.userId, input.userId),
              gte(eventsSchema.createdAt, getDayBounds(input.timezone).start),
              lte(eventsSchema.createdAt, getDayBounds(input.timezone).end),
            ),
          );

        const [event, metadata] = await Promise.all([
          generateObjectWithLogging(
            {
              model: openai(MODEL),
              mode: "json",
              temperature: 0.2,
              maxRetries: 0,
              messages: [
                { role: "system", content: system.text },
                {
                  role: "user",
                  content: prompt.text,
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "image",
                      image: new URL(input.imageUrl),
                    },
                  ],
                },
              ],
              schema: EventSchema,
            },
            { name: "eventFromImage.event" },
          ),
          generateObjectWithLogging(
            {
              model: openai(MODEL),
              mode: "json",
              temperature: 0.2,
              maxRetries: 0,
              messages: [
                { role: "system", content: systemMetadata.text },
                {
                  role: "user",
                  content: prompt.textMetadata,
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "image",
                      image: new URL(input.imageUrl),
                    },
                  ],
                },
              ],
              schema: EventMetadataSchema,
            },
            { name: "eventFromImage.metadata" },
          ),
        ]);

        const eventObject = { ...event.object, eventMetadata: metadata.object };

        const events = addCommonAddToCalendarProps([eventObject]);

        // const response = `${event.rawResponse?.toString() || ""} ${metadata.rawResponse?.toString()}`;
        // return { events, response };

        // adapted logic from event.create
        const userId = input.userId;
        const username = input.username;
        if (!userId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No user id found in session",
          });
        }

        if (!username) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No username found in session",
          });
        }

        const firstEvent = events[0];
        if (!firstEvent) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No events found in response",
          });
        }

        const hasComment = input.comment && input.comment.length > 0;
        const hasLists = input.lists.length > 0;
        const hasVisibility = input.visibility && input.visibility.length > 0;

        let startTime = firstEvent.startTime;
        let endTime = firstEvent.endTime;
        let timeZone = firstEvent.timeZone;

        // time zone is America/Los_Angeles if not specified
        if (!timeZone) {
          timeZone = "America/Los_Angeles";
        }

        // start time is 00:00 if not specified
        if (!startTime) {
          startTime = "00:00";
        }
        // end time is 23:59 if not specified
        if (!endTime) {
          endTime = "23:59";
        }

        const start = Temporal.ZonedDateTime.from(
          `${firstEvent.startDate}T${startTime}[${timeZone}]`,
        );
        const end = Temporal.ZonedDateTime.from(
          `${firstEvent.endDate}T${endTime}[${timeZone}]`,
        );
        const startUtcDate = new Date(start.epochMilliseconds);
        const endUtcDate = new Date(end.epochMilliseconds);
        const eventid = generatePublicId();

        const images = [
          input.imageUrl,
          input.imageUrl,
          input.imageUrl,
          input.imageUrl,
        ];

        const values = {
          id: eventid,
          userId: userId,
          userName: username || "unknown",
          event: { ...firstEvent, images },
          eventMetadata: firstEvent.eventMetadata,
          startDateTime: startUtcDate,
          endDateTime: endUtcDate,
          ...(hasVisibility && {
            visibility: input.visibility,
          }),
        };
        const createEvent = await ctx.db
          .transaction(async (tx) => {
            const insertEvent = async (event: NewEvent) => {
              return tx.insert(eventsSchema).values(event);
            };
            const insertComment = async (comment: NewComment) => {
              return tx.insert(comments).values(comment);
            };
            const insertEventToLists = async (
              eventToList: NewEventToLists[],
            ) => {
              return tx.insert(eventToLists).values(eventToList);
            };

            await insertEvent(values);
            if (hasComment) {
              await insertComment({
                eventId: eventid,
                content: input.comment || "",
                userId: userId,
              });
            } else {
              // no need to insert comment if there is no comment
            }
            if (hasLists) {
              await tx
                .delete(eventToLists)
                .where(eq(eventToLists.eventId, eventid));
              await insertEventToLists(
                input.lists.map((list) => ({
                  eventId: eventid,
                  listId: list.value!,
                })),
              );
            } else {
              // no need to insert event to list if there is no list
            }
          })
          .then(() => ({ id: eventid }));
        console.log("createEvent", createEvent);
        const { expoPushToken } = input;

        // Get daily event count (non-blocking)
        const dailyEvents = await dailyEventsPromise;
        const eventCount = dailyEvents.length;

        const { title, subtitle, body } = getNotificationContent(
          firstEvent.name,
          eventCount,
        );
        const notificationId = generateNotificationId();
        const message: ExpoPushMessage = {
          to: expoPushToken,
          sound: "default",
          title,
          subtitle,
          body,
          data: {
            url: `/event/${createEvent.id}`,
            notificationId,
          },
        };

        try {
          const [ticket] = await expo.sendPushNotificationsAsync([message]);

          posthog.capture({
            distinctId: input.userId,
            event: "notification_sent",
            properties: {
              success: true,
              notificationId,
              type: "event_creation",
              eventId: createEvent.id,
              title: title,
              source: "ai_router",
              method: "image",
              ticketId: getTicketId(ticket),
            },
          });

          return {
            success: true,
            ticket,
            eventId: createEvent.id,
          };
        } catch (error) {
          console.error("Error sending notification:", error);
          return {
            success: false,
            error: (error as Error).message,
          };
        }
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
