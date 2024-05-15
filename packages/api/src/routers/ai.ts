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
        seed: 4206969,
        messages: [
          { role: "system", content: system.text },
          { role: "user", content: input.rawText },
          { role: "system", content: prompt.text },
        ],
        schema: EventsSchema,
      });

      const events = addCommonAddToCalendarProps(object);
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
        seed: 4206969,
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
          { role: "system", content: prompt.text },
        ],
        schema: EventsSchema,
      });

      const events = addCommonAddToCalendarProps(object);
      return { events };
    }),
});
