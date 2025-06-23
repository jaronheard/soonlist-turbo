import { query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { QueryCtx } from "./_generated/server";

// Helper function to get the current user ID from auth
async function getUserId(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  return identity.subject;
}

// Main feed query that uses proper time-based filtering
export const getFeed = query({
  args: {
    feedId: v.string(),
    paginationOpts: paginationOptsValidator,
    filter: v.union(v.literal("upcoming"), v.literal("past")),
    beforeThisDateTime: v.optional(v.string()),
  },
  handler: async (ctx, { feedId, paginationOpts, filter, beforeThisDateTime }) => {
    // For personal feeds, verify access
    if (feedId.startsWith("user_")) {
      const requestedUserId = feedId.replace("user_", "");
      const currentUserId = await getUserId(ctx);
      
      // Allow access to own feed or throw error
      if (currentUserId && requestedUserId !== currentUserId) {
        throw new ConvexError("Unauthorized access to user feed");
      }
    }
    
    // Build the query with proper filtering
    let feedQuery = ctx.db
      .query("userFeeds")
      .withIndex("by_feed_time", q => q.eq("feedId", feedId));
    
    // Apply time filter if provided (for stable pagination)
    if (beforeThisDateTime) {
      const timestamp = new Date(beforeThisDateTime).getTime();
      feedQuery = feedQuery.filter(q => 
        filter === "upcoming" 
          ? q.gte(q.field("eventStartTime"), timestamp)
          : q.lt(q.field("eventStartTime"), timestamp)
      );
    }
    
    // Apply ordering based on filter
    const orderedQuery = filter === "upcoming" 
      ? feedQuery.order("asc")  // Earliest upcoming events first
      : feedQuery.order("desc"); // Latest past events first
    
    // Paginate
    const feedResults = await orderedQuery.paginate(paginationOpts);
    
    // Extract unique event IDs
    const eventIds = [...new Set(feedResults.page.map(item => item.eventId))];
    
    // Batch fetch events with their users
    const events = await Promise.all(
      eventIds.map(async (eventId) => {
        const event = await ctx.db
          .query("events")
          .withIndex("by_custom_id", q => q.eq("id", eventId))
          .first();
        
        if (!event) return null;
        
        // Only include events that match our filter criteria
        if (beforeThisDateTime) {
          const eventEndTime = new Date(event.endDateTime).getTime();
          const referenceTime = new Date(beforeThisDateTime).getTime();
          
          if (filter === "upcoming" && eventEndTime < referenceTime) return null;
          if (filter === "past" && eventEndTime >= referenceTime) return null;
        }
        
        // Fetch the user who created the event
        const user = await ctx.db
          .query("users")
          .withIndex("by_custom_id", q => q.eq("id", event.userId))
          .first();
        
        return {
          ...event,
          user,
        };
      })
    );
    
    // Filter out null events
    const validEvents = events.filter(event => event !== null);
    
    return {
      ...feedResults,
      page: validEvents,
    };
  },
});

// Helper query to get user's personal feed
export const getMyFeed = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
    beforeThisDateTime: v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, filter = "upcoming", beforeThisDateTime }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    
    const feedId = `user_${userId}`;
    
    // Use the same logic as getFeed but inline
    let feedQuery = ctx.db
      .query("userFeeds")
      .withIndex("by_feed_time", q => q.eq("feedId", feedId));
    
    if (beforeThisDateTime) {
      const timestamp = new Date(beforeThisDateTime).getTime();
      feedQuery = feedQuery.filter(q => 
        filter === "upcoming" 
          ? q.gte(q.field("eventStartTime"), timestamp)
          : q.lt(q.field("eventStartTime"), timestamp)
      );
    }
    
    const orderedQuery = filter === "upcoming" 
      ? feedQuery.order("asc")
      : feedQuery.order("desc");
    
    const feedResults = await orderedQuery.paginate(paginationOpts);
    
    const eventIds = [...new Set(feedResults.page.map(item => item.eventId))];
    
    const events = await Promise.all(
      eventIds.map(async (eventId) => {
        const event = await ctx.db
          .query("events")
          .withIndex("by_custom_id", q => q.eq("id", eventId))
          .first();
        
        if (!event) return null;
        
        if (beforeThisDateTime) {
          const eventEndTime = new Date(event.endDateTime).getTime();
          const referenceTime = new Date(beforeThisDateTime).getTime();
          
          if (filter === "upcoming" && eventEndTime < referenceTime) return null;
          if (filter === "past" && eventEndTime >= referenceTime) return null;
        }
        
        const user = await ctx.db
          .query("users")
          .withIndex("by_custom_id", q => q.eq("id", event.userId))
          .first();
        
        return {
          ...event,
          user,
        };
      })
    );
    
    const validEvents = events.filter(event => event !== null);
    
    return {
      ...feedResults,
      page: validEvents,
    };
  },
});

// Helper query to get discover feed
export const getDiscoverFeed = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
    beforeThisDateTime: v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, filter = "upcoming", beforeThisDateTime }) => {
    const feedId = "discover";
    
    // Use the same logic as getFeed but inline
    let feedQuery = ctx.db
      .query("userFeeds")
      .withIndex("by_feed_time", q => q.eq("feedId", feedId));
    
    if (beforeThisDateTime) {
      const timestamp = new Date(beforeThisDateTime).getTime();
      feedQuery = feedQuery.filter(q => 
        filter === "upcoming" 
          ? q.gte(q.field("eventStartTime"), timestamp)
          : q.lt(q.field("eventStartTime"), timestamp)
      );
    }
    
    const orderedQuery = filter === "upcoming" 
      ? feedQuery.order("asc")
      : feedQuery.order("desc");
    
    const feedResults = await orderedQuery.paginate(paginationOpts);
    
    const eventIds = [...new Set(feedResults.page.map(item => item.eventId))];
    
    const events = await Promise.all(
      eventIds.map(async (eventId) => {
        const event = await ctx.db
          .query("events")
          .withIndex("by_custom_id", q => q.eq("id", eventId))
          .first();
        
        if (!event) return null;
        
        if (beforeThisDateTime) {
          const eventEndTime = new Date(event.endDateTime).getTime();
          const referenceTime = new Date(beforeThisDateTime).getTime();
          
          if (filter === "upcoming" && eventEndTime < referenceTime) return null;
          if (filter === "past" && eventEndTime >= referenceTime) return null;
        }
        
        const user = await ctx.db
          .query("users")
          .withIndex("by_custom_id", q => q.eq("id", event.userId))
          .first();
        
        return {
          ...event,
          user,
        };
      })
    );
    
    const validEvents = events.filter(event => event !== null);
    
    return {
      ...feedResults,
      page: validEvents,
    };
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
  handler: async (ctx, { userId, paginationOpts, filter = "upcoming", beforeThisDateTime }) => {
    // Build query with proper index
    let eventsQuery = ctx.db
      .query("events")
      .withIndex("by_user_and_startDateTime", q => q.eq("userId", userId));
    
    // Apply time filter if provided
    if (beforeThisDateTime) {
      eventsQuery = eventsQuery.filter(q => {
        const dateFilter = filter === "upcoming"
          ? q.gte(q.field("endDateTime"), beforeThisDateTime)
          : q.lt(q.field("endDateTime"), beforeThisDateTime);
        return dateFilter;
      });
    }
    
    // Apply ordering based on filter
    const orderedQuery = filter === "upcoming"
      ? eventsQuery.order("asc")
      : eventsQuery.order("desc");
    
    // Paginate
    const results = await orderedQuery.paginate(paginationOpts);
    
    // Fetch the user who created the events
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", q => q.eq("id", userId))
      .first();
    
    // Enrich events with user data
    const enrichedEvents = results.page.map(event => ({
      ...event,
      user,
    }));
    
    return {
      ...results,
      page: enrichedEvents,
    };
  },
});