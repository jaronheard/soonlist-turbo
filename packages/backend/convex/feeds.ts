import { query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { QueryCtx } from "./_generated/server";

// Helper function to get the current user ID from auth
async function getUserId(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  return identity.subject;
}

// Internal handler for feed logic
async function getFeedHandler(
  ctx: QueryCtx, 
  { feedId, cursor, limit = 50 }: { feedId: string; cursor?: string; limit?: number }
) {
  // For personal feeds, verify access
  if (feedId.startsWith("user_")) {
    const requestedUserId = feedId.replace("user_", "");
    const currentUserId = await getUserId(ctx);
    
    // Allow access to own feed or throw error
    if (currentUserId && requestedUserId !== currentUserId) {
      throw new ConvexError("Unauthorized access to user feed");
    }
  }
  
  // Get feed items with pagination
  const feedQuery = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_time", q => q.eq("feedId", feedId))
    .order("desc")
    .paginate({ cursor: cursor ?? null, numItems: limit });
  
  // Extract unique event IDs to avoid duplicates
  const eventIds = [...new Set(feedQuery.page.map(item => item.eventId))];
  
  // Batch fetch events using the custom id index
  const events = await Promise.all(
    eventIds.map(async (eventId) => {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", q => q.eq("id", eventId))
        .first();
      
      if (!event) return null;
      
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
  
  // Filter out null events (deleted or not found)
  const validEvents = events.filter(event => event !== null);
  
  return {
    page: validEvents,
    continueCursor: feedQuery.continueCursor,
    isDone: feedQuery.isDone,
  };
}

export const getFeed = query({
  args: {
    feedId: v.string(), // "user_123", "discover", etc.
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return getFeedHandler(ctx, args);
  },
});

// Helper query to get user's personal feed
export const getMyFeed = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    
    return getFeedHandler(ctx, {
      feedId: `user_${userId}`,
      cursor: args.cursor,
      limit: args.limit,
    });
  },
});

// Helper query to get discover feed
export const getDiscoverFeed = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return getFeedHandler(ctx, {
      feedId: "discover",
      cursor: args.cursor,
      limit: args.limit,
    });
  },
});