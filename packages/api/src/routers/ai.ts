import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { Langfuse } from "langfuse";
import { z } from "zod";

import {
  addCommonAddToCalendarProps,
  EventMetadataSchema,
  EventSchema,
  getPrompt,
  getSystemMessage,
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
      const prompt = getPrompt(input.timezone);

      const generateObjectWithLogging = async <T>(
        generateObjectOptions: Parameters<typeof generateObject<T>>[0],
        loggingOptions: { name: string },
      ): Promise<ReturnType<typeof generateObject<T>>> => {
        const trace = langfuse.trace({
          name: loggingOptions.name,
          sessionId: ctx.auth.sessionId,
          userId: ctx.auth.userId,
          input: input.rawText,
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
        const result = await generateObject(generateObjectOptions);
        generation.end({
          output: result.rawResponse?.toString(),
        });
        generation.score({
          name: "quality",
          value: 1,
          comment: "Untested",
        });
        await langfuse.flushAsync(); // TODO: don't block for this
        return result;
      };

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
              { role: "system", content: system.text },
              {
                role: "user",
                content: `${prompt.text} Input: """
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
      const prompt = getPrompt(input.timezone);

      const generateObjectWithLogging = async <T>(
        generateObjectOptions: Parameters<typeof generateObject<T>>[0],
        loggingOptions: { name: string },
      ): Promise<ReturnType<typeof generateObject<T>>> => {
        const trace = langfuse.trace({
          name: loggingOptions.name,
          sessionId: ctx.auth.sessionId,
          userId: ctx.auth.userId,
          input: input.imageUrl,
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
        const result = await generateObject(generateObjectOptions);
        generation.end({
          output: result.rawResponse?.toString(),
        });
        generation.score({
          name: "quality",
          value: 1,
          comment: "Untested",
        });
        await langfuse.flushAsync(); // TODO: don't block for this
        return result;
      };

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
            model: openai("gpt-4o"),
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
