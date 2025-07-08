import type { PaginationOptions } from "convex/server";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import type { QueryCtx } from "./_generated/server";
import { internalMutation, query } from "./_generated/server";

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
  // Use the new index that includes hasEnded for efficient filtering
  const hasEnded = filter === "past";
  
  const feedQuery = ctx.db
    .query("userFeeds")
    .withIndex("by_feed_hasEnded_startTime", (q) => 
      q.eq("feedId", feedId).eq("hasEnded", hasEnded)
    )
    .order(filter === "upcoming" ? "asc" : "desc"); // Orders by eventStartTime

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

  // Filter out null events and sort by start time
  const validEvents = events
    .filter((event) => event !== null)
    .sort((a, b) => {
      const aStart = new Date(a.startDateTime).getTime();
      const bStart = new Date(b.startDateTime).getTime();
      // For upcoming events, sort ascending (earliest first)
      // For past events, sort descending (most recent first)
      return filter === "upcoming" ? aStart - bStart : bStart - aStart;
    });

  return {
    ...feedResults,
    page: validEvents,
  };
}

// Main feed query that uses proper time-based filtering
export const getFeed = query({
  args: {
    feedId: v.string(),
    paginationOpts: paginationOptsValidator,
    filter: v.union(v.literal("upcoming"), v.literal("past")),
    beforeThisDateTime: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { feedId, paginationOpts, filter, beforeThisDateTime },
  ) => {
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
    beforeThisDateTime: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { paginationOpts, filter = "upcoming", beforeThisDateTime },
  ) => {
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
    beforeThisDateTime: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { paginationOpts, filter = "upcoming", beforeThisDateTime },
  ) => {
    const feedId = "discover";

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

// Internal mutation to update hasEnded flags for all userFeeds entries
export const updateHasEndedFlags = internalMutation({
  args: {},
  handler: async (ctx) => {
    const currentTime = Date.now();
    let totalUpdated = 0;
    let totalProcessed = 0;

    // Process in batches to avoid hitting limits
    const batchSize = 100;
    let isDone = false;

    while (!isDone) {
      // Get a batch of feed entries
      const feedEntries = await ctx.db.query("userFeeds").take(batchSize);

      if (feedEntries.length === 0) {
        isDone = true;
        break;
      }

      totalProcessed += feedEntries.length;

      // Update each entry
      for (const entry of feedEntries) {
        const shouldHaveEnded = entry.eventEndTime < currentTime;

        // Only update if the value has changed
        if (entry.hasEnded !== shouldHaveEnded) {
          await ctx.db.patch(entry._id, {
            hasEnded: shouldHaveEnded,
          });
          totalUpdated++;
        }
      }

      // If we got less than batchSize, we're done
      if (feedEntries.length < batchSize) {
        isDone = true;
      }
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
