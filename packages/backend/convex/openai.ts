import { v } from "convex/values";
import OpenAI from "openai";
import { z } from "zod";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, query } from "./_generated/server";
import { missingEnvVariableUrl } from "./utils";

export const openaiKeySet = query({
  args: {},
  handler: () => {
    return !!process.env.OPENAI_API_KEY;
  },
});

// Define the expected response schema from OpenAI
const OpenAIResponseSchema = z.object({
  summary: z.string(),
});

export const summary = internalAction({
  args: {
    id: v.id("notes"),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { id, title, content }) => {
    const prompt = `Take in the following note and return a summary: Title: ${title}, Note content: ${content}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const error = missingEnvVariableUrl(
        "OPENAI_API_KEY",
        "https://platform.openai.com/account/api-keys",
      );
      console.error(error);
      await ctx.runMutation(internal.openai.saveSummary, {
        id: id,
        summary: error,
      });
      return;
    }
    const openai = new OpenAI({ apiKey });
    const output = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant designed to output JSON in this format: {summary: string}",
        },
        { role: "user", content: prompt },
      ],
      model: "gpt-4-1106-preview",
      response_format: { type: "json_object" },
    });

    // Pull the message content out of the response
    const messageContent = output.choices[0]?.message.content;

    console.log({ messageContent });

    try {
      if (!messageContent) {
        throw new Error("No message content received from OpenAI");
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const rawParsedOutput = JSON.parse(messageContent) as unknown;
      const parsedOutput = OpenAIResponseSchema.parse(rawParsedOutput);

      console.log({ parsedOutput });

      await ctx.runMutation(internal.openai.saveSummary, {
        id: id,
        summary: parsedOutput.summary,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to parse OpenAI response:", errorMessage);
      const fallbackSummary = "Failed to generate summary due to parsing error";

      await ctx.runMutation(internal.openai.saveSummary, {
        id: id,
        summary: fallbackSummary,
      });
    }
  },
});

export const saveSummary = internalMutation({
  args: {
    id: v.id("notes"),
    summary: v.string(),
  },
  handler: async (ctx, { id, summary }) => {
    await ctx.db.patch(id, {
      summary: summary,
    });
  },
});
