import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import * as Events from "./model/events";
import { enrichEventsAndFilterNulls } from "./model/events";

// Validators for complex types
const eventDataValidator = v.object({
  name: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  startTime: v.optional(v.string()),
  endTime: v.optional(v.string()),
  timeZone: v.optional(v.string()),
  location: v.optional(v.string()),
  description: v.optional(v.string()),
  images: v.optional(v.array(v.string())),
});

const eventMetadataValidator = v.optional(
  v.object({
    accessibility: v.optional(v.array(v.string())),
    accessibilityNotes: v.optional(v.string()),
    ageRestriction: v.optional(v.string()),
    category: v.optional(v.string()),
    mentions: v.optional(v.array(v.string())),
    performers: v.optional(v.array(v.string())),
    priceMax: v.optional(v.number()),
    priceMin: v.optional(v.number()),
    priceType: v.optional(v.string()),
    source: v.optional(v.string()),
    type: v.optional(v.string()),
  }),
);

const listValidator = v.object({
  value: v.string(),
});

/**
 * Get events for a specific user by username
 */
export const getForUser = query({
  args: { userName: v.string() },
  handler: async (ctx, args) => {
    return await Events.getEventsForUser(ctx, args.userName);
  },
});

/**
 * Get upcoming events for a user (created + saved)
 */
export const getUpcomingForUser = query({
  args: { userName: v.string() },
  handler: async (ctx, args) => {
    return await Events.getUpcomingEventsForUser(ctx, args.userName);
  },
});

/**
 * Get created events for a user
 */
export const getCreatedForUser = query({
  args: { userName: v.string() },
  handler: async (ctx, args) => {
    return await Events.getEventsForUser(ctx, args.userName);
  },
});

/**
 * Get events that a user is following
 */
export const getFollowingForUser = query({
  args: { userName: v.string() },
  handler: async (ctx, args) => {
    return await Events.getFollowingEventsForUser(ctx, args.userName);
  },
});

/**
 * Get upcoming events from following (optimized)
 */
export const getFollowingUpcomingForUser = query({
  args: { userName: v.string() },
  handler: async (ctx, args) => {
    return await Events.getFollowingUpcomingEventsForUser(ctx, args.userName);
  },
});

/**
 * Get saved events for a user
 */
export const getSavedForUser = query({
  args: { userName: v.string() },
  handler: async (ctx, args) => {
    return await Events.getSavedEventsForUser(ctx, args.userName);
  },
});

/**
 * Get saved event IDs for a user
 */
export const getSavedIdsForUser = query({
  args: { userName: v.string() },
  handler: async (ctx, args) => {
    return await Events.getSavedEventIdsForUser(ctx, args.userName);
  },
});

/**
 * Get possible duplicate events based on start time
 */
export const getPossibleDuplicates = query({
  args: { startDateTime: v.string() },
  handler: async (ctx, args) => {
    const startDateTime = new Date(args.startDateTime);
    return await Events.getPossibleDuplicateEvents(ctx, startDateTime);
  },
});

/**
 * Get a single event by ID
 */
export const get = query({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    return await Events.getEventById(ctx, args.eventId);
  },
});

/**
 * Get all events
 */
export const getAll = query({
  args: {},
  handler: async (ctx, _args) => {
    return await Events.getAllEvents(ctx);
  },
});

/**
 * Get next upcoming events
 */
export const getNext = query({
  args: {
    limit: v.optional(v.number()),
    excludeCurrent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await Events.getNextEvents(ctx, args.limit, args.excludeCurrent);
  },
});

/**
 * Get discover events with Convex pagination
 */
export const getDiscoverPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    beforeThisDateTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User must be logged in to discover events",
        data: { args },
      });
    }

    const { beforeThisDateTime } = args;

    // Get all events that are upcoming and public, excluding user's own events
    const result = await ctx.db
      .query("events")
      .filter((q) => {
        const baseFilter = q.and(
          q.eq(q.field("visibility"), "public"),
          q.neq(q.field("userId"), identity.subject),
        );

        // Apply date filter only if beforeThisDateTime is provided
        if (beforeThisDateTime) {
          return q.and(
            baseFilter,
            q.gte(q.field("endDateTime"), beforeThisDateTime),
          );
        }

        return baseFilter;
      })
      .order("asc")
      .paginate(args.paginationOpts);

    // Enrich events with user data, comments, and follows
    const enrichedEvents = await enrichEventsAndFilterNulls(ctx, result.page);

    return {
      ...result,
      page: enrichedEvents,
    };
  },
});

/**
 * Get events for user with Convex pagination (upcoming or past)
 * This efficiently queries both owned and followed events in a single operation
 */
export const getEventsForUserPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    userName: v.string(),
    filter: v.union(v.literal("upcoming"), v.literal("past")),
    beforeThisDateTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userName, filter, beforeThisDateTime } = args;

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", userName))
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        data: { args },
      });
    }

    // Get followed event IDs efficiently
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    const followedEventIds = new Set(eventFollows.map((ef) => ef.eventId));

    // Create a single query that filters for events that are either:
    // 1. Created by the user, OR
    // 2. Followed by the user
    // AND optionally match the date filter
    const eventsQuery = ctx.db.query("events").filter((q) => {
      const userFilter = q.eq(q.field("userId"), user.id);

      // If there are no followed events, just filter by user
      if (followedEventIds.size === 0) {
        // Apply date filter only if beforeThisDateTime is provided
        if (beforeThisDateTime) {
          const dateFilter =
            filter === "upcoming"
              ? q.gte(q.field("endDateTime"), beforeThisDateTime)
              : q.lt(q.field("endDateTime"), beforeThisDateTime);
          return q.and(dateFilter, userFilter);
        }
        return userFilter;
      }

      // Create OR conditions for followed events
      const followedEventFilters = Array.from(followedEventIds).map((eventId) =>
        q.eq(q.field("id"), eventId),
      );

      const eventFilter = q.or(userFilter, ...followedEventFilters);

      // Apply date filter only if beforeThisDateTime is provided
      if (beforeThisDateTime) {
        const dateFilter =
          filter === "upcoming"
            ? q.gte(q.field("endDateTime"), beforeThisDateTime)
            : q.lt(q.field("endDateTime"), beforeThisDateTime);
        return q.and(dateFilter, eventFilter);
      }

      return eventFilter;
    });

    // Apply ordering and pagination
    const orderedQuery =
      filter === "upcoming"
        ? eventsQuery.order("asc")
        : eventsQuery.order("desc");

    const result = await orderedQuery.paginate(args.paginationOpts);

    // Enrich events with user data, comments, and follows
    const enrichedEvents = await enrichEventsAndFilterNulls(ctx, result.page);

    return {
      ...result,
      page: enrichedEvents,
    };
  },
});

/**
 * Get user stats
 */
export const getStats = query({
  args: { userName: v.string() },
  handler: async (ctx, args) => {
    return await Events.getUserStats(ctx, args.userName);
  },
});

/**
 * Create a new event
 */
export const create = mutation({
  args: {
    event: eventDataValidator,
    eventMetadata: eventMetadataValidator,
    comment: v.optional(v.string()),
    lists: v.array(listValidator),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User must be logged in to create events",
        data: { args },
      });
    }

    // Get user info
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        data: { userId: identity.subject },
      });
    }

    return await Events.createEvent(
      ctx,
      identity.subject,
      user.username,
      args.event,
      args.eventMetadata,
      args.comment,
      args.lists,
      args.visibility,
    );
  },
});

/**
 * Update an existing event
 */
export const update = mutation({
  args: {
    id: v.string(),
    event: eventDataValidator,
    eventMetadata: eventMetadataValidator,
    comment: v.optional(v.string()),
    lists: v.array(listValidator),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User must be logged in to update events",
        data: { args },
      });
    }

    // Check if user is admin (you may need to implement this based on your auth system)
    const isAdmin = false; // TODO: Implement admin check

    return await Events.updateEvent(
      ctx,
      identity.subject,
      args.id,
      args.event,
      args.eventMetadata,
      args.comment,
      args.lists,
      args.visibility,
      isAdmin,
    );
  },
});

/**
 * Delete an event
 */
export const deleteEvent = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User must be logged in to delete events",
        data: { args },
      });
    }

    // Check if user is admin (you may need to implement this based on your auth system)
    const isAdmin = false; // TODO: Implement admin check

    return await Events.deleteEvent(ctx, identity.subject, args.id, isAdmin);
  },
});

/**
 * Follow an event
 */
export const follow = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User must be logged in to follow events",
        data: { args },
      });
    }

    return await Events.followEvent(ctx, identity.subject, args.id);
  },
});

/**
 * Unfollow an event
 */
export const unfollow = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User must be logged in to unfollow events",
        data: { args },
      });
    }

    return await Events.unfollowEvent(ctx, identity.subject, args.id);
  },
});

/**
 * Toggle event visibility
 */
export const toggleVisibility = mutation({
  args: {
    id: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User must be logged in to change event visibility",
        data: { args },
      });
    }

    return await Events.toggleEventVisibility(
      ctx,
      identity.subject,
      args.id,
      args.visibility,
    );
  },
});

// ============================================================================
// INTERNAL ACTIONS FOR WORKFLOW
// ============================================================================

/**
 * Insert event into database
 */
export const insertEvent = internalMutation({
  args: {
    firstEvent: eventDataValidator,
    uploadedImageUrl: v.union(v.string(), v.null()),
    timezone: v.string(),
    comment: v.optional(v.string()),
    lists: v.array(v.object({ value: v.string() })),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    userId: v.string(),
    username: v.string(),
  },
  returns: v.string(), // eventId
  handler: async (ctx, args): Promise<string> => {
    const { firstEvent, uploadedImageUrl, comment, lists, visibility } = args;

    // Add uploaded image to event if available
    const eventData = {
      ...firstEvent,
      ...(uploadedImageUrl && {
        images: [
          uploadedImageUrl,
          uploadedImageUrl,
          uploadedImageUrl,
          uploadedImageUrl,
        ],
      }),
    };
    const eventMetadata = undefined; // No metadata for now

    const result = await Events.createEvent(
      ctx,
      args.userId,
      args.username,
      eventData,
      eventMetadata,
      comment,
      lists,
      visibility,
    );

    return result.id;
  },
});

/**
 * Internal mutation to create an event (called from workflow)
 */
export const createEvent = internalMutation({
  args: {
    userId: v.string(),
    username: v.string(),
    eventData: eventDataValidator,
    eventMetadata: eventMetadataValidator,
    comment: v.optional(v.string()),
    lists: v.array(v.object({ value: v.string() })),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  },
  returns: v.object({ id: v.string() }),
  handler: async (ctx, args) => {
    return await Events.createEvent(
      ctx,
      args.userId,
      args.username,
      args.eventData,
      args.eventMetadata,
      args.comment,
      args.lists,
      args.visibility,
    );
  },
});

/**
 * Internal query to get an event by ID (called from workflow)
 */
export const getEventById = internalQuery({
  args: { eventId: v.string() },
  returns: v.union(v.object({ name: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const event = await Events.getEventById(ctx, args.eventId);
    if (!event?.name) {
      return null;
    }
    return { name: event.name };
  },
});

/**
 * Internal query to get today's events count for a user (called from workflow)
 */
export const getTodayEventsCount = internalQuery({
  args: { userId: v.string() },
  returns: v.array(v.object({ id: v.string() })),
  handler: async (ctx, args) => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.gte(q.field("created_at"), startOfDay.toISOString()),
          q.lte(q.field("created_at"), endOfDay.toISOString()),
        ),
      )
      .collect();

    return events.map((event) => ({ id: event.id }));
  },
});
