import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

// Type for Apify Instagram post data
interface ApifyInstagramPost {
  id: string;
  shortCode: string;
  url: string;
  caption: string;
  timestamp: string;
  displayUrl?: string;
  type: string;
}

// Type for AI classification result
interface ClassificationResult {
  isEvent: boolean;
  confidence: number;
}

/**
 * Fetch recent posts from an Instagram profile using Apify.
 */
async function fetchRecentPosts(
  username: string,
): Promise<ApifyInstagramPost[]> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) {
    throw new Error("APIFY_API_TOKEN environment variable is not set");
  }

  const response = await fetch(
    "https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apifyToken}`,
      },
      body: JSON.stringify({
        usernames: [username],
        resultsLimit: 12, // Only fetch last 12 posts
        resultsType: "posts",
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Apify API error (${response.status}): ${errorText.slice(0, 200)}`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const data = (await response.json()) as ApifyInstagramPost[];
  return data;
}

/**
 * Classify whether an Instagram post is about an event using AI.
 */
async function classifyPost(caption: string): Promise<ClassificationResult> {
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;
  const openrouterBaseUrl =
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

  if (!openrouterApiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  const systemPrompt = `You are an event classifier. Given an Instagram post caption, determine if it describes an event that people can attend.

An event has ALL of the following:
- A specific date/time (or is happening "tonight", "this Saturday", etc.)
- A location or venue (physical or virtual)
- Something people can attend or participate in

NOT events: general announcements, product launches without attendance, motivational posts, memes, personal updates.

Respond ONLY with valid JSON: {"isEvent": true/false, "confidence": 0.0-1.0}`;

  const response = await fetch(`${openrouterBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openrouterApiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash:nitro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: caption },
      ],
      temperature: 0,
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const result = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  const content = result.choices[0]?.message?.content || "";

  try {
    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = /\{[\s\S]*\}/.exec(content);
    if (!jsonMatch) {
      return { isEvent: false, confidence: 0 };
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const parsed = JSON.parse(jsonMatch[0]) as ClassificationResult;
    return {
      isEvent: !!parsed.isEvent,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    };
  } catch {
    return { isEvent: false, confidence: 0 };
  }
}

/**
 * Internal mutation to record a processed post.
 */
export const recordProcessedPost = internalMutation({
  args: {
    sourceId: v.id("instagramSources"),
    postUrl: v.string(),
    postId: v.string(),
    isEvent: v.boolean(),
    eventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("instagramProcessedPosts", {
      sourceId: args.sourceId,
      postUrl: args.postUrl,
      postId: args.postId,
      isEvent: args.isEvent,
      eventId: args.eventId,
      processedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to update source status after processing.
 */
export const updateSourceStatus = internalMutation({
  args: {
    sourceId: v.id("instagramSources"),
    lastCheckedAt: v.number(),
    lastPostId: v.optional(v.string()),
    postsChecked: v.number(),
    eventsFound: v.number(),
    status: v.optional(
      v.union(v.literal("active"), v.literal("inactive"), v.literal("error")),
    ),
    errorMessage: v.optional(v.string()),
    checkIntervalHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) return;

    await ctx.db.patch(args.sourceId, {
      lastCheckedAt: args.lastCheckedAt,
      ...(args.lastPostId !== undefined ? { lastPostId: args.lastPostId } : {}),
      postsChecked: source.postsChecked + args.postsChecked,
      eventsFound: source.eventsFound + args.eventsFound,
      ...(args.status ? { status: args.status } : {}),
      ...(args.errorMessage !== undefined
        ? { errorMessage: args.errorMessage }
        : {}),
      ...(args.checkIntervalHours !== undefined
        ? { checkIntervalHours: args.checkIntervalHours }
        : {}),
    });
  },
});

/**
 * Internal mutation to check if a post URL has already been processed.
 */
export const isPostProcessed = internalMutation({
  args: {
    postUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("instagramProcessedPosts")
      .withIndex("by_post_url", (q) => q.eq("postUrl", args.postUrl))
      .first();
    return !!existing;
  },
});

/**
 * Internal action: Process a single Instagram source.
 * Fetches posts, classifies them, and creates events.
 */
export const processSource = internalAction({
  args: {
    sourceId: v.id("instagramSources"),
    username: v.string(),
    listId: v.string(),
  },
  handler: async (ctx, args) => {
    const { sourceId, username, listId } = args;

    let postsChecked = 0;
    let eventsFound = 0;
    let lastPostId: string | undefined;

    try {
      // Fetch recent posts via Apify
      const posts = await fetchRecentPosts(username);

      if (posts.length > 0) {
        lastPostId = posts[0]?.id;
      }

      for (const post of posts) {
        if (!post.caption || !post.url) continue;

        // Check if already processed
        const alreadyProcessed = await ctx.runMutation(
          internal.instagramScraper.isPostProcessed,
          { postUrl: post.url },
        );
        if (alreadyProcessed) continue;

        postsChecked++;

        // Classify the post
        const classification = await classifyPost(post.caption);

        if (!classification.isEvent || classification.confidence < 0.7) {
          // Record as non-event
          await ctx.runMutation(internal.instagramScraper.recordProcessedPost, {
            sourceId,
            postUrl: post.url,
            postId: post.id || post.shortCode || post.url,
            isEvent: false,
          });
          continue;
        }

        // Extract event using existing AI pipeline
        const systemUserId = process.env.SYSTEM_USER_ID;
        if (!systemUserId) {
          throw new Error("SYSTEM_USER_ID not configured");
        }

        try {
          // Use the existing text extraction pipeline
          const aiResult = await ctx.runAction(
            internal.ai.extractEventFromText,
            {
              rawText: post.caption,
              timezone: "America/Los_Angeles", // Default timezone
            },
          );

          if (aiResult.events.length > 0) {
            const firstEvent = await ctx.runAction(
              internal.ai.validateFirstEvent,
              { events: aiResult.events },
            );

            // Add Instagram metadata to the event
            const eventMetadata = {
              ...(firstEvent.eventMetadata || {}),
              platform: "instagram",
              sourceUrls: [post.url],
              source: `@${username}`,
            };

            // Create the event owned by system user
            const result = await ctx.runMutation(internal.events.createEvent, {
              userId: systemUserId,
              username: "soonlist-system",
              eventData: {
                ...firstEvent,
                eventMetadata: undefined,
              },
              eventMetadata,
              lists: [{ value: listId }],
              visibility: "public",
            });

            // Record as event
            await ctx.runMutation(
              internal.instagramScraper.recordProcessedPost,
              {
                sourceId,
                postUrl: post.url,
                postId: post.id || post.shortCode || post.url,
                isEvent: true,
                eventId: result.id,
              },
            );

            eventsFound++;
          } else {
            // AI couldn't extract event data
            await ctx.runMutation(
              internal.instagramScraper.recordProcessedPost,
              {
                sourceId,
                postUrl: post.url,
                postId: post.id || post.shortCode || post.url,
                isEvent: false,
              },
            );
          }
        } catch (error) {
          console.error(
            `Error processing post ${post.url}:`,
            error instanceof Error ? error.message : "Unknown error",
          );
          // Record as processed to avoid retrying
          await ctx.runMutation(internal.instagramScraper.recordProcessedPost, {
            sourceId,
            postUrl: post.url,
            postId: post.id || post.shortCode || post.url,
            isEvent: false,
          });
        }
      }

      // Update source status - success
      await ctx.runMutation(internal.instagramScraper.updateSourceStatus, {
        sourceId,
        lastCheckedAt: Date.now(),
        lastPostId,
        postsChecked,
        eventsFound,
        status: "active",
        errorMessage: undefined,
        checkIntervalHours: 4, // Reset to default on success
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Error processing source @${username}:`, errorMessage);

      // Update with backoff
      await ctx.runMutation(internal.instagramScraper.updateSourceStatus, {
        sourceId,
        lastCheckedAt: Date.now(),
        postsChecked,
        eventsFound,
        status: "error",
        errorMessage,
        // Double interval on error (max 24h)
        checkIntervalHours: Math.min(24, 4 * 2),
      });
    }
  },
});

/**
 * Cron handler: Check all active sources that are due for checking.
 */
export const checkDueSources = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all active sources
    const sources = await ctx.runMutation(
      internal.instagramScraper.getActiveDueSources,
    );

    for (const source of sources) {
      try {
        await ctx.runAction(internal.instagramScraper.processSource, {
          sourceId: source._id as Id<"instagramSources">,
          username: source.username,
          listId: source.listId,
        });
      } catch (error) {
        console.error(
          `Failed to process source @${source.username}:`,
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }
  },
});

/**
 * Internal mutation to get active sources that are due for checking.
 */
export const getActiveDueSources = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const activeSources = await ctx.db
      .query("instagramSources")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Filter to sources that are due (enough time has passed since last check)
    return activeSources.filter((source) => {
      if (!source.lastCheckedAt) return true; // Never checked
      const intervalMs = source.checkIntervalHours * 60 * 60 * 1000;
      return now - source.lastCheckedAt >= intervalMs;
    });
  },
});

/**
 * Admin: Manually trigger a check for a specific source.
 */
export const checkNow = internalAction({
  args: {
    username: v.string(),
  },
  handler: async (ctx, { username }) => {
    const normalizedUsername = username.replace(/^@/, "").toLowerCase().trim();

    const sources = await ctx.runMutation(
      internal.instagramScraper.getActiveDueSources,
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const source = sources.find((s: { username: string }) => s.username === normalizedUsername);
    if (!source) {
      throw new ConvexError(
        `Source @${normalizedUsername} not found or not active`,
      );
    }

    await ctx.runAction(internal.instagramScraper.processSource, {
      sourceId: source._id as Id<"instagramSources">,
      username: source.username,
      listId: source.listId,
    });
  },
});
