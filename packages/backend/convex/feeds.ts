import type { PaginationOptions } from "convex/server";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";

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
  beforeThisDateTime?: string,
) {
  // Build the query with proper filtering
  let feedQuery = ctx.db
    .query("userFeeds")
    .withIndex("by_feed_time", (q) => q.eq("feedId", feedId));

  // Apply time filter if provided (for stable pagination)
  if (beforeThisDateTime) {
    const timestamp = new Date(beforeThisDateTime).getTime();
    feedQuery = feedQuery.filter((q) =>
      filter === "upcoming"
        ? q.gte(q.field("eventStartTime"), timestamp)
        : q.lt(q.field("eventStartTime"), timestamp),
    );
  }

  // Apply ordering based on filter
  const orderedQuery =
    filter === "upcoming"
      ? feedQuery.order("asc") // Earliest upcoming events first
      : feedQuery.order("desc"); // Latest past events first

  // Paginate
  const feedResults = await orderedQuery.paginate(paginationOpts);

  // Extract unique event IDs
  const eventIds = [...new Set(feedResults.page.map((item) => item.eventId))];

  // Batch fetch events with their users
  const events = await Promise.all(
    eventIds.map(async (eventId) => {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", eventId))
        .first();

      if (!event) return null;

      // Only include events that match our filter criteria
      const eventEndTime = new Date(event.endDateTime).getTime();
      const eventStartTime = new Date(event.startDateTime).getTime();
      const referenceTime = beforeThisDateTime
        ? new Date(beforeThisDateTime).getTime()
        : Date.now();

      if (filter === "upcoming" && eventEndTime < referenceTime) return null;
      if (filter === "past" && eventStartTime >= referenceTime) return null;

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

  // Filter out null events
  const validEvents = events.filter((event) => event !== null);

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
    return queryFeed(ctx, feedId, paginationOpts, filter, beforeThisDateTime);
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
    return queryFeed(ctx, feedId, paginationOpts, filter, beforeThisDateTime);
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
    return queryFeed(ctx, feedId, paginationOpts, filter, beforeThisDateTime);
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

    // Apply time filter if provided
    if (beforeThisDateTime) {
      eventsQuery = eventsQuery.filter((q) => {
        const dateFilter =
          filter === "upcoming"
            ? q.gte(q.field("endDateTime"), beforeThisDateTime)
            : q.lt(q.field("startDateTime"), beforeThisDateTime);
        return dateFilter;
      });
    }

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

    // Filter events based on current time if no beforeThisDateTime provided
    const now = Date.now();
    const filteredEvents = results.page.filter((event) => {
      const eventEndTime = new Date(event.endDateTime).getTime();
      const eventStartTime = new Date(event.startDateTime).getTime();
      const referenceTime = beforeThisDateTime
        ? new Date(beforeThisDateTime).getTime()
        : now;

      if (filter === "upcoming" && eventEndTime < referenceTime) return false;
      if (filter === "past" && eventStartTime >= referenceTime) return false;
      return true;
    });

    // Enrich events with user data
    const enrichedEvents = filteredEvents.map((event) => ({
      ...event,
      user,
    }));

    return {
      ...results,
      page: enrichedEvents,
    };
  },
});
