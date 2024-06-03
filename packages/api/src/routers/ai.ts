import { openai } from "@ai-sdk/openai";
import { waitUntil } from "@vercel/functions";
import { generateObject } from "ai";
import { Langfuse } from "langfuse";
import { z } from "zod";

import {
  addCommonAddToCalendarProps,
  EventMetadataSchema,
  EventSchema,
  getPrompt,
  getSystemMessage,
  getSystemMessageMetadata,
} from "@soonlist/cal";

import { createTRPCRouter, protectedProcedure } from "../trpc";

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
  secretKey: process.env.LANGFUSE_SECRET_KEY || "",
  baseUrl: process.env.LANGFUSE_BASE_URL || "",
});

const MODEL = "gpt-4o";

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
});
