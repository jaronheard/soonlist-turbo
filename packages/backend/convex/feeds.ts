import type { PaginationOptions } from "convex/server";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, query } from "./_generated/server";
import { userFeedsAggregate } from "./aggregates";

// Helper function to get the current user ID from auth
async function getUserId(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  return identity.subject;
}

// Helper function to query feed with common logic
async function queryFeed(
  ctx: QueryCtx,
  feedId: string,
  paginationOpts: PaginationOptions,
  filter: "upcoming" | "past" = "upcoming",
) {
  // Use the new index for efficient filtering
  const hasEnded = filter === "past";
  const order = filter === "upcoming" ? "asc" : "desc";

  const feedQuery = ctx.db
    .query("userFeeds")
    .withIndex("by_feed_hasEnded_startTime", (q) =>
      q.eq("feedId", feedId).eq("hasEnded", hasEnded),
    )
    .order(order);

  // Paginate
  const feedResults = await feedQuery.paginate(paginationOpts);

  // Map feed entries to full events with users, preserving order
  const events = await Promise.all(
    feedResults.page.map(async (feedEntry) => {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", feedEntry.eventId))
        .first();

      if (!event) return null;

      // Fetch the user who created the event
      const user = await ctx.db
        .query("users")
        .withIndex("by_custom_id", (q) => q.eq("id", event.userId))
        .first();

      return {
        ...event,
        user,
      };
    }),
  );

  // Filter out null events (should be rare)
  const validEvents = events.filter((event) => event !== null);

  return {
    ...feedResults,
    page: validEvents,
  };
}

// Main feed query that uses proper hasEnded-based filtering
export const getFeed = query({
  args: {
    feedId: v.string(),
    paginationOpts: paginationOptsValidator,
    filter: v.union(v.literal("upcoming"), v.literal("past")),
  },
  handler: async (ctx, { feedId, paginationOpts, filter }) => {
    // For personal feeds, verify access
    if (feedId.startsWith("user_")) {
      const requestedUserId = feedId.replace("user_", "");
      const currentUserId = await getUserId(ctx);

      // Require authentication for user feeds
      if (!currentUserId) {
        throw new ConvexError("Authentication required to access user feeds");
      }

      // Only allow access to own feed
      if (requestedUserId !== currentUserId) {
        throw new ConvexError("Unauthorized access to user feed");
      }
    }

    // Use the common query function
    return queryFeed(ctx, feedId, paginationOpts, filter);
  },
});

// Helper query to get user's personal feed
export const getMyFeed = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
  },
  handler: async (ctx, { paginationOpts, filter = "upcoming" }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const feedId = `user_${userId}`;

    // Use the common query function
    return queryFeed(ctx, feedId, paginationOpts, filter);
  },
});

// Helper query to get discover feed
export const getDiscoverFeed = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
  },
  handler: async (ctx, { paginationOpts, filter = "upcoming" }) => {
    const feedId = "discover";

    // Use the common query function
    return queryFeed(ctx, feedId, paginationOpts, filter);
  },
});

// Helper query to get a user's public feed (when publicListEnabled is true)
export const getPublicUserFeed = query({
  args: {
    username: v.string(),
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
  },
  handler: async (ctx, { username, paginationOpts, filter = "upcoming" }) => {
    // Get the user by username
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Check if the user has enabled public list sharing
    if (!user.publicListEnabled) {
      throw new ConvexError("User has not enabled public list sharing");
    }

    const feedId = `user_${user.id}`;

    // Use the common query function
    return queryFeed(ctx, feedId, paginationOpts, filter);
  },
});

// Query to get only events created by a specific user (sorted by start time)
export const getUserCreatedEvents = query({
  args: {
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
    beforeThisDateTime: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { userId, paginationOpts, filter = "upcoming", beforeThisDateTime },
  ) => {
    // Build query with proper index
    let eventsQuery = ctx.db
      .query("events")
      .withIndex("by_user_and_startDateTime", (q) => q.eq("userId", userId));

    // Apply time filter - use current time if not provided
    const referenceDateTime = beforeThisDateTime || new Date().toISOString();
    eventsQuery = eventsQuery.filter((q) =>
      filter === "upcoming"
        ? q.gte(q.field("endDateTime"), referenceDateTime)
        : q.lt(q.field("endDateTime"), referenceDateTime),
    );

    // Apply ordering based on filter
    const orderedQuery =
      filter === "upcoming"
        ? eventsQuery.order("asc")
        : eventsQuery.order("desc");

    // Paginate
    const results = await orderedQuery.paginate(paginationOpts);

    // Fetch the user who created the events
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", userId))
      .first();

    // Enrich events with user data
    const enrichedEvents = results.page.map((event) => ({
      ...event,
      user,
    }));

    return {
      ...results,
      page: enrichedEvents,
    };
  },
});

// Internal mutation to update hasEndedFlags for a batch of userFeeds entries
export const updateHasEndedFlagsBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    updated: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const currentTime = Date.now();
    let updated = 0;

    // Get a single batch with the provided cursor
    const result = await ctx.db
      .query("userFeeds")
      .order("asc")
      .paginate({ numItems: batchSize, cursor });

    // Process each entry in the batch
    for (const entry of result.page) {
      const shouldHaveEnded = entry.eventEndTime < currentTime;

      if (entry.hasEnded !== shouldHaveEnded) {
        const oldDoc = entry;
        await ctx.db.patch(entry._id, {
          hasEnded: shouldHaveEnded,
        });
        const updatedDoc = (await ctx.db.get(entry._id))!;
        await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);
        updated++;
      }
    }

    return {
      processed: result.page.length,
      updated,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

// Internal action to orchestrate updating hasEnded flags across all userFeeds
export const updateHasEndedFlagsAction = internalAction({
  args: {},
  returns: v.object({
    totalProcessed: v.number(),
    totalUpdated: v.number(),
  }),
  handler: async (ctx) => {
    let totalProcessed = 0;
    let totalUpdated = 0;
    let cursor: string | null = null;
    const batchSize = 2048;

    // Process batches until no more data
    while (true) {
      const result: {
        processed: number;
        updated: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(internal.feeds.updateHasEndedFlagsBatch, {
        cursor,
        batchSize,
      });

      totalProcessed += result.processed;
      totalUpdated += result.updated;

      if (result.isDone) {
        break;
      }
      cursor = result.nextCursor;
    }

    console.log(
      `Updated hasEnded flags: ${totalUpdated} changed out of ${totalProcessed} processed`,
    );

    return {
      totalProcessed,
      totalUpdated,
    };
  },
});
