import type { JSONSchema7 } from "json-schema";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

import {
  addCommonAddToCalendarProps,
  EventMetadataSchema,
  EventSchema,
  EventsSchema,
  getPrompt,
  getSystemMessage,
} from "@soonlist/cal";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export function convertZodToJSONSchema(
  zodSchema: z.Schema<unknown>,
): JSONSchema7 {
  // we assume that zodToJsonSchema will return a valid JSONSchema7
  return zodToJsonSchema(zodSchema) as JSONSchema7;
}

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

export const aiRouter = createTRPCRouter({
  eventFromRawText: protectedProcedure
    .input(
      z.object({
        rawText: z.string(),
        timezone: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const system = getSystemMessage();
      const prompt = getPrompt(input.timezone);

      const [event, metadata] = await Promise.all([
        generateObject({
          model: openai("gpt-4o"),
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
        }),
        generateObject({
          model: openai("gpt-4o"),
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
        }),
      ]);

      // console.log("event", event);
      console.log("metadata", metadata);

      const eventObject = { ...event.object, eventMetadata: metadata.object };

      const events = addCommonAddToCalendarProps([eventObject]);
      return { events };
    }),
  eventFromImage: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string(),
        timezone: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const system = getSystemMessage();
      const prompt = getPrompt(input.timezone);

      const { object } = await generateObject({
        model: openai("gpt-4o"),
        messages: [
          {
            role: "system",
            content: system.text,
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
          { role: "user", content: prompt.text },
        ],
        schema: z.object({ events: EventsSchema }),
      });

      const events = addCommonAddToCalendarProps(object.events);
      return { events };
    }),
});
