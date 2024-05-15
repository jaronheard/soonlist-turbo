import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import {
  addCommonAddToCalendarProps,
  EventMetadataSchema,
  EventSchema,
  getPrompt,
  getSystemMessage,
} from "@soonlist/cal";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const aiRouter = createTRPCRouter({
  testError: publicProcedure.query(() => {
    throw new Error("This is a test error");
  }),
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
        }),
      ]);

      const eventObject = { ...event.object, eventMetadata: metadata.object };

      const events = addCommonAddToCalendarProps([eventObject]);
      const response = `${event.rawResponse?.toString() || ""} ${metadata.rawResponse?.toString()}`;
      return { events, response };
    }),
});
