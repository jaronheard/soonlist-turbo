import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import {
  addCommonAddToCalendarProps,
  EventsSchema,
  getPrompt,
  getSystemMessage,
} from "@soonlist/cal";

import { createTRPCRouter, protectedProcedure } from "../trpc";

// const groq = createOpenAI({
//   baseURL: "https://api.groq.com/openai/v1",
//   apiKey: process.env.GROQ_API_KEY,
// });

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

      const { object, finishReason, usage, warnings } = await generateObject({
        model: openai("gpt-4o-2024-05-13"),
        mode: "auto",
        temperature: 0,
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
        schema: z.object({ events: EventsSchema }),
      });

      console.log("warnings", warnings);
      console.log("usage", usage);
      console.log("finishReason", finishReason);

      const events = addCommonAddToCalendarProps(object.events);
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
