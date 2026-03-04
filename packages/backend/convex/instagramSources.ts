import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { sanitizeInstagramUsername } from "./model/instagramHelpers";

const MAX_SOURCES_PER_USER = 10;
const DEFAULT_CHECK_INTERVAL_HOURS = 4;
const MIN_CHECK_INTERVAL_HOURS = 1;

/**
 * Add a new Instagram source to track
 */
export const add = mutation({
  args: {
    instagramUsername: v.string(),
    checkIntervalHours: v.optional(v.number()),
  },
  returns: v.object({
    sourceId: v.id("instagramSources"),
    username: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const userId = identity.subject;
    const username = sanitizeInstagramUsername(args.instagramUsername);
    if (!username) {
      throw new ConvexError({
        message: "Invalid Instagram username",
        data: { input: args.instagramUsername },
      });
    }

    // Check if user already tracks this username
    const existing = await ctx.db
      .query("instagramSources")
      .withIndex("by_user_and_username", (q) =>
        q.eq("userId", userId).eq("username", username),
      )
      .first();

    if (existing) {
      throw new ConvexError({
        message: "You are already tracking this Instagram account",
        data: { username },
      });
    }

    // Check user's source limit
    const userSources = await ctx.db
      .query("instagramSources")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (userSources.length >= MAX_SOURCES_PER_USER) {
      throw new ConvexError({
        message: `Maximum of ${MAX_SOURCES_PER_USER} Instagram sources allowed`,
        data: { current: userSources.length, max: MAX_SOURCES_PER_USER },
      });
    }

    const checkInterval = Math.max(
      MIN_CHECK_INTERVAL_HOURS,
      args.checkIntervalHours ?? DEFAULT_CHECK_INTERVAL_HOURS,
    );

    const sourceId = await ctx.db.insert("instagramSources", {
      userId,
      username,
      profileUrl: `https://www.instagram.com/${username}`,
      status: "active",
      checkIntervalHours: checkInterval,
      postsChecked: 0,
      eventsFound: 0,
      createdAt: Date.now(),
    });

    // Schedule an immediate first check
    await ctx.scheduler.runAfter(0, internal.instagramScraper.processSource, {
      sourceId,
    });

    return { sourceId, username };
  },
});

/**
 * Remove an Instagram source
 */
export const remove = mutation({
  args: {
    sourceId: v.id("instagramSources"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const source = await ctx.db.get(args.sourceId);
    if (!source) {
      throw new ConvexError("Source not found");
    }

    if (source.userId !== identity.subject) {
      throw new ConvexError("Not authorized to remove this source");
    }

    // Delete all processed post records for this source
    // NOTE: For a prototype this is fine, but at scale (hundreds+ of posts)
    // this could exceed Convex mutation time/write limits. Consider paginated
    // deletion via scheduled mutations if this becomes an issue.
    const processedPosts = await ctx.db
      .query("instagramProcessedPosts")
      .withIndex("by_source", (q) => q.eq("sourceId", args.sourceId))
      .collect();

    await Promise.all(processedPosts.map((post) => ctx.db.delete(post._id)));

    await ctx.db.delete(args.sourceId);
    return null;
  },
});

/**
 * Pause tracking an Instagram source
 */
export const pause = mutation({
  args: {
    sourceId: v.id("instagramSources"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const source = await ctx.db.get(args.sourceId);
    if (source?.userId !== identity.subject) {
      throw new ConvexError("Source not found or not authorized");
    }

    await ctx.db.patch(args.sourceId, { status: "paused" });
    return null;
  },
});

/**
 * Resume tracking an Instagram source
 */
export const resume = mutation({
  args: {
    sourceId: v.id("instagramSources"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const source = await ctx.db.get(args.sourceId);
    if (source?.userId !== identity.subject) {
      throw new ConvexError("Source not found or not authorized");
    }

    await ctx.db.patch(args.sourceId, {
      status: "active",
      errorMessage: undefined,
    });
    return null;
  },
});

/**
 * Manually trigger a check for a source (rate-limited)
 */
export const checkNow = mutation({
  args: {
    sourceId: v.id("instagramSources"),
  },
  returns: v.object({ scheduled: v.boolean() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const source = await ctx.db.get(args.sourceId);
    if (source?.userId !== identity.subject) {
      throw new ConvexError("Source not found or not authorized");
    }

    // Rate limit: at least 30 minutes between manual checks
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    if (source.lastCheckedAt && source.lastCheckedAt > thirtyMinutesAgo) {
      throw new ConvexError({
        message: "Please wait at least 30 minutes between manual checks",
        data: {
          lastCheckedAt: source.lastCheckedAt,
          nextAllowedAt: source.lastCheckedAt + 30 * 60 * 1000,
        },
      });
    }

    await ctx.scheduler.runAfter(0, internal.instagramScraper.processSource, {
      sourceId: args.sourceId,
    });

    return { scheduled: true };
  },
});

/**
 * List all Instagram sources for the current user
 */
export const listForUser = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("instagramSources"),
      username: v.string(),
      displayName: v.optional(v.string()),
      profileUrl: v.string(),
      status: v.union(
        v.literal("active"),
        v.literal("paused"),
        v.literal("error"),
      ),
      errorMessage: v.optional(v.string()),
      lastCheckedAt: v.optional(v.number()),
      checkIntervalHours: v.number(),
      postsChecked: v.number(),
      eventsFound: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const sources = await ctx.db
      .query("instagramSources")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return sources.map((s) => ({
      _id: s._id,
      username: s.username,
      displayName: s.displayName,
      profileUrl: s.profileUrl,
      status: s.status,
      errorMessage: s.errorMessage,
      lastCheckedAt: s.lastCheckedAt,
      checkIntervalHours: s.checkIntervalHours,
      postsChecked: s.postsChecked,
      eventsFound: s.eventsFound,
      createdAt: s.createdAt,
    }));
  },
});

/**
 * Get all active sources that are due for checking (internal, used by cron)
 */
export const getDueSources = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("instagramSources"),
      userId: v.string(),
      username: v.string(),
      checkIntervalHours: v.number(),
      lastCheckedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    const activeSources = await ctx.db
      .query("instagramSources")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const now = Date.now();
    return activeSources
      .filter((source) => {
        if (!source.lastCheckedAt) return true; // Never checked
        const intervalMs = source.checkIntervalHours * 60 * 60 * 1000;
        return now - source.lastCheckedAt >= intervalMs;
      })
      .map((s) => ({
        _id: s._id,
        userId: s.userId,
        username: s.username,
        checkIntervalHours: s.checkIntervalHours,
        lastCheckedAt: s.lastCheckedAt,
      }));
  },
});

/**
 * Update source status after processing (internal)
 */
export const updateAfterCheck = internalMutation({
  args: {
    sourceId: v.id("instagramSources"),
    postsChecked: v.number(),
    eventsFound: v.number(),
    lastPostTimestamp: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) return null;

    if (args.error) {
      await ctx.db.patch(args.sourceId, {
        status: "error",
        errorMessage: args.error,
        lastCheckedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(args.sourceId, {
        status: "active",
        errorMessage: undefined,
        lastCheckedAt: Date.now(),
        postsChecked: source.postsChecked + args.postsChecked,
        eventsFound: source.eventsFound + args.eventsFound,
        lastPostTimestamp: args.lastPostTimestamp ?? source.lastPostTimestamp,
      });
    }
    return null;
  },
});

/**
 * Check if a post URL has already been processed (internal)
 */
export const isPostProcessed = internalQuery({
  args: {
    sourceId: v.id("instagramSources"),
    postUrl: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("instagramProcessedPosts")
      .withIndex("by_source_and_url", (q) =>
        q.eq("sourceId", args.sourceId).eq("postUrl", args.postUrl),
      )
      .first();
    return existing !== null;
  },
});

/**
 * Atomically claim a batch of unprocessed posts so concurrent scrapes don't
 * duplicate work. Because this is a single Convex mutation the read+write is
 * transactional: the first concurrent run to reach a post wins the claim,
 * and subsequent runs will see it as already processed.
 *
 * Claimed posts are inserted with `isEvent: false` as a placeholder. After
 * AI extraction the caller updates the record via `updateProcessedPost`.
 * If extraction fails, the placeholder stays (the post won't be retried,
 * which is acceptable for this prototype).
 */
export const claimUnprocessedPosts = internalMutation({
  args: {
    sourceId: v.id("instagramSources"),
    postUrls: v.array(
      v.object({
        url: v.string(),
        timestamp: v.optional(v.string()),
      }),
    ),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const claimedUrls: string[] = [];

    for (const post of args.postUrls) {
      const existing = await ctx.db
        .query("instagramProcessedPosts")
        .withIndex("by_source_and_url", (q) =>
          q.eq("sourceId", args.sourceId).eq("postUrl", post.url),
        )
        .first();

      if (existing) {
        // Already claimed by another run (or a previous run) – skip
        continue;
      }

      // Claim this post by inserting a placeholder record
      await ctx.db.insert("instagramProcessedPosts", {
        sourceId: args.sourceId,
        postUrl: post.url,
        postTimestamp: post.timestamp,
        isEvent: false,
        processedAt: Date.now(),
      });

      claimedUrls.push(post.url);
    }

    return claimedUrls;
  },
});

/**
 * Record a processed post (internal)
 */
export const recordProcessedPost = internalMutation({
  args: {
    sourceId: v.id("instagramSources"),
    postUrl: v.string(),
    postTimestamp: v.optional(v.string()),
    isEvent: v.boolean(),
    eventId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("instagramProcessedPosts", {
      sourceId: args.sourceId,
      postUrl: args.postUrl,
      postTimestamp: args.postTimestamp,
      isEvent: args.isEvent,
      eventId: args.eventId,
      processedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Update an already-claimed processed post record with final results (internal).
 * Used after AI extraction to mark a claimed post as an event.
 */
export const updateProcessedPost = internalMutation({
  args: {
    sourceId: v.id("instagramSources"),
    postUrl: v.string(),
    isEvent: v.boolean(),
    eventId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("instagramProcessedPosts")
      .withIndex("by_source_and_url", (q) =>
        q.eq("sourceId", args.sourceId).eq("postUrl", args.postUrl),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isEvent: args.isEvent,
        eventId: args.eventId,
        processedAt: Date.now(),
      });
    }
    return null;
  },
});

/**
 * Get source by ID (internal)
 */
export const getSource = internalQuery({
  args: {
    sourceId: v.id("instagramSources"),
  },
  returns: v.union(
    v.object({
      _id: v.id("instagramSources"),
      userId: v.string(),
      username: v.string(),
      profileUrl: v.string(),
      status: v.union(
        v.literal("active"),
        v.literal("paused"),
        v.literal("error"),
      ),
      lastPostTimestamp: v.optional(v.string()),
      checkIntervalHours: v.number(),
      postsChecked: v.number(),
      eventsFound: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source) return null;
    return {
      _id: source._id,
      userId: source.userId,
      username: source.username,
      profileUrl: source.profileUrl,
      status: source.status,
      lastPostTimestamp: source.lastPostTimestamp,
      checkIntervalHours: source.checkIntervalHours,
      postsChecked: source.postsChecked,
      eventsFound: source.eventsFound,
    };
  },
});
