import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { fetchAndProcessEvent } from "./model/aiHelpers";
import { createEvent } from "./model/events";

const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || "";
const SYSTEM_USERNAME = "soonlist";
const APIFY_API_KEY = process.env.APIFY_API_KEY || "";
const MAX_POSTS_PER_CHECK = 12;

// ============================================================================
// Types
// ============================================================================

interface ApifyPost {
  id: string;
  shortCode: string;
  caption: string;
  url: string;
  timestamp: string;
  likesCount: number;
  commentsCount: number;
  displayUrl: string;
  type: string;
}

interface ClassificationResult {
  isEvent: boolean;
  confidence: number;
}

// ============================================================================
// Apify Fetcher
// ============================================================================

async function fetchInstagramPosts(
  username: string,
): Promise<ApifyPost[]> {
  if (!APIFY_API_KEY) {
    throw new ConvexError("APIFY_API_KEY environment variable is not set");
  }

  const response = await fetch(
    "https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APIFY_API_KEY}`,
      },
      body: JSON.stringify({
        usernames: [username],
        resultsLimit: MAX_POSTS_PER_CHECK,
        resultsType: "posts",
      }),
    },
  );

  if (!response.ok) {
    throw new ConvexError({
      message: `Apify API error: ${response.status} ${response.statusText}`,
      data: { username, status: response.status },
    });
  }

  const data = (await response.json()) as ApifyPost[];
  return data;
}

// ============================================================================
// AI Classification
// ============================================================================

async function classifyPost(caption: string): Promise<ClassificationResult> {
  // Use a simple heuristic + keyword approach for classification
  // This avoids an extra AI call for every post
  const eventKeywords = [
    "join us",
    "tickets",
    "rsvp",
    "register",
    "admission",
    "doors open",
    "showtime",
    "lineup",
    "performing",
    "live at",
    "this saturday",
    "this sunday",
    "this friday",
    "tonight",
    "tomorrow",
    "next week",
    "happening",
    "come out",
    "don't miss",
    "save the date",
    "event",
    "festival",
    "concert",
    "show",
    "workshop",
    "class",
    "meetup",
    "gathering",
    "exhibition",
    "opening",
    "launch party",
    "happy hour",
    "brunch",
    "dinner",
    "pop-up",
    "popup",
  ];

  const lowerCaption = caption.toLowerCase();
  let score = 0;

  for (const keyword of eventKeywords) {
    if (lowerCaption.includes(keyword)) {
      score += 1;
    }
  }

  // Check for date/time patterns
  const datePatterns = [
    /\b\d{1,2}\/\d{1,2}\b/, // 12/25
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}\b/i, // March 15
    /\b\d{1,2}\s+(?:am|pm)\b/i, // 7 PM
    /\b\d{1,2}:\d{2}\b/, // 7:00
    /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  ];

  for (const pattern of datePatterns) {
    if (pattern.test(caption)) {
      score += 2;
    }
  }

  // Confidence based on keyword matches
  const confidence = Math.min(1, score / 5);
  return {
    isEvent: confidence >= 0.4,
    confidence,
  };
}

// ============================================================================
// Internal Actions
// ============================================================================

/**
 * Process a single Instagram source: fetch posts, classify, extract events.
 */
export const processSource = internalAction({
  args: {
    username: v.string(),
  },
  handler: async (ctx, { username }) => {
    // Get the source from the database
    const source = await ctx.runQuery(
      internal.instagramScraper.getSourceByUsername,
      { username },
    );

    if (!source) {
      console.error(`Instagram source not found for username: ${username}`);
      return;
    }

    if (source.status !== "active") {
      console.log(`Skipping inactive source: ${username}`);
      return;
    }

    try {
      // Fetch recent posts from Instagram via Apify
      const posts = await fetchInstagramPosts(username);

      let postsChecked = 0;
      let eventsFound = 0;

      for (const post of posts) {
        if (!post.caption) continue;

        const postUrl =
          post.url || `https://instagram.com/p/${post.shortCode}`;

        // Check if already processed
        const alreadyProcessed: boolean = await ctx.runQuery(
          internal.instagramScraper.isPostProcessed,
          { postUrl },
        );

        if (alreadyProcessed) continue;

        postsChecked++;

        // Classify the post
        const classification = await classifyPost(post.caption);

        if (!classification.isEvent || classification.confidence < 0.4) {
          // Record as non-event
          await ctx.runMutation(
            internal.instagramScraper.recordProcessedPost,
            {
              sourceId: source._id,
              postId: post.id || post.shortCode,
              postUrl,
              isEvent: false,
            },
          );
          continue;
        }

        // Process through AI event extraction pipeline
        try {
          const result = await fetchAndProcessEvent({
            ctx,
            input: {
              rawText: post.caption,
              timezone: "America/Los_Angeles", // Default timezone
            },
            fnName: "instagramScraper.processSource",
          });

          if (result.events.length > 0) {
            const firstEvent = result.events[0];
            const eventData = firstEvent;
            const eventMetadata = firstEvent.eventMetadata || {};

            // Add Instagram-specific metadata
            const enrichedMetadata = {
              ...eventMetadata,
              platform: "instagram",
              sourceUrls: [postUrl],
              mentions: [username, ...(eventMetadata.mentions || [])],
            };

            // Create the event via internal mutation
            const eventResult = await ctx.runMutation(
              internal.instagramScraper.createEventForSource,
              {
                eventData: {
                  name: eventData.name,
                  startDate: eventData.startDate,
                  endDate: eventData.endDate,
                  startTime: eventData.startTime,
                  endTime: eventData.endTime,
                  timeZone: eventData.timeZone,
                  location: eventData.location,
                  description: eventData.description,
                  images: post.displayUrl ? [post.displayUrl] : undefined,
                },
                eventMetadata: enrichedMetadata,
                listId: source.listId,
              },
            );

            // Record as event
            await ctx.runMutation(
              internal.instagramScraper.recordProcessedPost,
              {
                sourceId: source._id,
                postId: post.id || post.shortCode,
                postUrl,
                isEvent: true,
                eventId: eventResult.id,
              },
            );

            eventsFound++;
          } else {
            // AI didn't extract an event
            await ctx.runMutation(
              internal.instagramScraper.recordProcessedPost,
              {
                sourceId: source._id,
                postId: post.id || post.shortCode,
                postUrl,
                isEvent: false,
              },
            );
          }
        } catch (error) {
          console.error(
            `Error processing post ${postUrl}:`,
            error instanceof Error ? error.message : String(error),
          );
          // Record as processed but not an event to avoid reprocessing
          await ctx.runMutation(
            internal.instagramScraper.recordProcessedPost,
            {
              sourceId: source._id,
              postId: post.id || post.shortCode,
              postUrl,
              isEvent: false,
            },
          );
        }
      }

      // Update source tracking
      await ctx.runMutation(internal.instagramScraper.updateSourceAfterCheck, {
        sourceId: source._id,
        postsChecked,
        eventsFound,
        lastPostId: posts[0]?.id || posts[0]?.shortCode,
      });
    } catch (error) {
      console.error(
        `Error processing source ${username}:`,
        error instanceof Error ? error.message : String(error),
      );

      // Record error on source
      await ctx.runMutation(internal.instagramScraper.updateSourceError, {
        sourceId: source._id,
        errorMessage:
          error instanceof Error ? error.message : String(error),
      });
    }
  },
});

/**
 * Cron handler: check all active sources that are due.
 */
export const checkDueSources = internalAction({
  args: {},
  handler: async (ctx) => {
    const activeSources = await ctx.runQuery(
      internal.instagramScraper.getActiveSources,
      {},
    );

    const now = Date.now();

    for (const source of activeSources) {
      const lastChecked = source.lastCheckedAt || 0;
      const intervalMs = (source.checkIntervalHours || 4) * 60 * 60 * 1000;

      if (now - lastChecked > intervalMs) {
        // Schedule processing for this source
        await ctx.scheduler.runAfter(
          0,
          internal.instagramScraper.processSource,
          { username: source.username },
        );
      }
    }
  },
});

// ============================================================================
// Internal Queries
// ============================================================================

export const getSourceByUsername = internalQuery({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    return await ctx.db
      .query("instagramSources")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();
  },
});

export const isPostProcessed = internalQuery({
  args: { postUrl: v.string() },
  handler: async (ctx, { postUrl }) => {
    const existing = await ctx.db
      .query("instagramProcessedPosts")
      .withIndex("by_post_url", (q) => q.eq("postUrl", postUrl))
      .first();
    return !!existing;
  },
});

export const getActiveSources = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("instagramSources")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

// ============================================================================
// Internal Mutations
// ============================================================================

export const recordProcessedPost = internalMutation({
  args: {
    sourceId: v.id("instagramSources"),
    postId: v.string(),
    postUrl: v.string(),
    isEvent: v.boolean(),
    eventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("instagramProcessedPosts", {
      sourceId: args.sourceId,
      postId: args.postId,
      postUrl: args.postUrl,
      isEvent: args.isEvent,
      eventId: args.eventId,
      processedAt: Date.now(),
    });
  },
});

export const createEventForSource = internalMutation({
  args: {
    eventData: v.object({
      name: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      startTime: v.optional(v.string()),
      endTime: v.optional(v.string()),
      timeZone: v.optional(v.string()),
      location: v.optional(v.string()),
      description: v.optional(v.string()),
      images: v.optional(v.array(v.string())),
    }),
    eventMetadata: v.any(),
    listId: v.string(),
  },
  returns: v.object({ id: v.string() }),
  handler: async (ctx, args) => {
    const result = await createEvent(
      ctx,
      SYSTEM_USER_ID,
      SYSTEM_USERNAME,
      args.eventData,
      args.eventMetadata,
      undefined, // no comment
      [{ value: args.listId }], // add to source list
      "public", // always public for scraped events
    );

    return result;
  },
});

export const updateSourceAfterCheck = internalMutation({
  args: {
    sourceId: v.id("instagramSources"),
    postsChecked: v.number(),
    eventsFound: v.number(),
    lastPostId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) return;

    await ctx.db.patch(args.sourceId, {
      lastCheckedAt: Date.now(),
      postsChecked: (source.postsChecked || 0) + args.postsChecked,
      eventsFound: (source.eventsFound || 0) + args.eventsFound,
      ...(args.lastPostId ? { lastPostId: args.lastPostId } : {}),
      status: "active",
      errorMessage: undefined,
    });
  },
});

export const updateSourceError = internalMutation({
  args: {
    sourceId: v.id("instagramSources"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) return;

    // Double the check interval on errors (up to 24 hours)
    const newInterval = Math.min(
      24,
      (source.checkIntervalHours || 4) * 2,
    );

    await ctx.db.patch(args.sourceId, {
      lastCheckedAt: Date.now(),
      status: "error",
      errorMessage: args.errorMessage,
      checkIntervalHours: newInterval,
    });
  },
});
