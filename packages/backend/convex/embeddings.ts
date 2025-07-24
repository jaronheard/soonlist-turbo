import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

function formatDateTime(
  date: string,
  time?: string,
  timeZone?: string,
): string {
  if (!time) return date;

  const dateTime = new Date(`${date}T${time}`);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    timeZone: timeZone || undefined,
  };

  return (
    dateTime.toLocaleString("en-US", options) + (timeZone ? ` ${timeZone}` : "")
  );
}

function buildEventText(event: Doc<"events">): string {
  const parts: string[] = [];

  // Add name
  if (event.name) {
    parts.push(`Event: ${event.name}`);
  }

  // Add description
  if (event.description) {
    parts.push(`Description: ${event.description}`);
  }

  // Add location
  if (event.location) {
    parts.push(`Location: ${event.location}`);
  }

  // Add formatted date/time with timezone
  if (event.startDate) {
    const formattedDateTime = formatDateTime(
      event.startDate,
      event.startTime,
      event.timeZone,
    );
    parts.push(`When: ${formattedDateTime}`);
  }

  // Add metadata if available
  const eventMetadata = event.eventMetadata;
  if (eventMetadata && typeof eventMetadata === "object") {
    const metadata = eventMetadata as Record<string, unknown>;

    if (metadata.category && typeof metadata.category === "string") {
      parts.push(`Category: ${metadata.category}`);
    }

    if (metadata.type && typeof metadata.type === "string") {
      parts.push(`Type: ${metadata.type}`);
    }

    if (
      metadata.performers &&
      Array.isArray(metadata.performers) &&
      metadata.performers.length > 0
    ) {
      parts.push(`Performers: ${(metadata.performers as string[]).join(", ")}`);
    }

    if (
      metadata.mentions &&
      Array.isArray(metadata.mentions) &&
      metadata.mentions.length > 0
    ) {
      parts.push(`Mentions: ${(metadata.mentions as string[]).join(", ")}`);
    }

    if (metadata.priceType && typeof metadata.priceType === "string") {
      parts.push(`Price: ${metadata.priceType}`);
    }

    if (
      metadata.ageRestriction &&
      typeof metadata.ageRestriction === "string" &&
      metadata.ageRestriction !== "all"
    ) {
      parts.push(`Age restriction: ${metadata.ageRestriction}`);
    }
  }

  return parts.join("\n");
}

export const generateEmbedding = internalAction({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Get the event
    const event = await ctx.runQuery(internal.embeddings.getEventForEmbedding, {
      eventId: args.eventId,
    });

    if (!event) {
      throw new Error(`Event ${args.eventId} not found`);
    }

    // Build text representation of the event
    const eventText = buildEventText(event);

    // Generate embedding using OpenAI
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: eventText,
    });

    // Store the embedding
    await ctx.runMutation(internal.embeddings.storeEmbedding, {
      eventId: args.eventId,
      embedding: Array.from(embedding),
    });
  },
});

export const getEventForEmbedding = internalQuery({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});

export const storeEmbedding = internalMutation({
  args: {
    eventId: v.id("events"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      embedding: args.embedding,
    });
  },
});
