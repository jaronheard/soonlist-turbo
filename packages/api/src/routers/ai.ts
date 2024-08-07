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
import { eq } from "@soonlist/db";
import {
  comments,
  events as eventsSchema,
  eventToLists,
} from "@soonlist/db/schema";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { generatePublicId } from "../utils";

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
// Create a single Expo SDK client to be reused
const expo = new Expo();

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

      console.log("systemMetadata", systemMetadata);

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

        const title = "Soonlist";
        const body = "Your event is ready to go!";
        const data = { url: `/event/${createEvent.id}` };

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
      } catch (error) {
        const { expoPushToken } = input;

        const title = "Soonlist";
        const body = "There was an error creating your event.";
        const data = { url: "/new/preview" };

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

        const title = "Soonlist";
        const body = "Your event is ready to go!";
        const data = { url: `/event/${createEvent.id}` };

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
      } catch (error) {
        const { expoPushToken } = input;

        const title = "Soonlist";
        const body = "There was an error creating your event.";
        const data = { url: "/new/preview" };

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
      }
    }),
});
