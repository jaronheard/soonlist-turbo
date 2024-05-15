import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import {
  addCommonAddToCalendarProps,
  EventsSchema,
  getPrompt,
  getSystemMessage,
} from "@soonlist/cal";

import { createTRPCRouter, protectedProcedure } from "../trpc";

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

      const { object } = await generateObject({
        model: openai("gpt-4o-2024-05-13"),
        messages: [
          { role: "system", content: system.text },
          { role: "user", content: prompt.text },
          { role: "user", content: input.rawText },
        ],
        schema: z.object({ events: EventsSchema }),
      });

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
        model: openai("gpt-4o-2024-05-13"),
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
