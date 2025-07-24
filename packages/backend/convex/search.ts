import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { action, query } from "./_generated/server";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const searchEvents = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    userId: v.optional(v.string()),
    onlyPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Generate embedding for the search query
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: args.query,
    });

    // Build filter function based on parameters
    const buildFilter = () => {
      if (args.onlyPublic && args.userId) {
        return (q: any) =>
          q.eq("visibility", "public").and(q.eq("userId", args.userId));
      } else if (args.onlyPublic) {
        return (q: any) => q.eq("visibility", "public");
      } else if (args.userId) {
        return (q: any) => q.eq("userId", args.userId);
      }
      return undefined;
    };

    // Perform vector search
    const results = await ctx.vectorSearch("events", "by_embedding", {
      vector: Array.from(embedding),
      limit,
      filter: buildFilter(),
    });

    // Fetch full event documents with scores
    const eventsWithScores = await Promise.all(
      results.map(async (result) => {
        const event = await ctx.runQuery(api.search.getEventById, {
          eventId: result._id,
        });
        return event
          ? {
              ...event,
              _score: result._score,
            }
          : null;
      }),
    );

    // Filter out null events
    const validEvents = eventsWithScores.filter(
      (event): event is Doc<"events"> & { _score: number } => event !== null,
    );

    // Filter out past events but with lower weight
    const now = new Date();
    const sortedEvents = validEvents
      .map((event) => {
        const eventDate = new Date(event.startDateTime);
        const isPast = eventDate < now;
        const daysDiff = Math.abs(
          (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Reduce score for past events and events far in the future
        let adjustedScore = event._score;
        if (isPast) {
          // Past events get 50% score reduction
          adjustedScore *= 0.5;
        } else if (daysDiff > 30) {
          // Events more than 30 days out get progressively lower scores
          adjustedScore *= Math.max(0.3, 1 - (daysDiff - 30) / 365);
        }

        return {
          ...event,
          _adjustedScore: adjustedScore,
        };
      })
      .sort((a, b) => b._adjustedScore - a._adjustedScore);

    return sortedEvents;
  },
});

export const getEventById = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});
