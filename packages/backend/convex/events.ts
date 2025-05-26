import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import * as Events from "./model/events";

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
 * Get discover events (excluding user's own events)
 */
export const getDiscover = query({
  args: {
    limit: v.optional(v.number()),
    excludeCurrent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("User must be logged in to discover events");
    }

    return await Events.getDiscoverEvents(
      ctx,
      identity.subject,
      args.limit,
      args.excludeCurrent,
    );
  },
});

/**
 * Get discover events with infinite scroll
 */
export const getDiscoverInfinite = query({
  args: {
    limit: v.number(),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("User must be logged in to discover events");
    }

    const { limit, cursor } = args;
    const offset = cursor || 0;

    const events = await Events.getDiscoverEvents(
      ctx,
      identity.subject,
      limit + 1,
      true,
    );

    let nextCursor: number | undefined = undefined;
    if (events.length > limit) {
      events.pop();
      nextCursor = offset + limit;
    }

    return {
      events,
      nextCursor,
    };
  },
});

/**
 * Get discover events with Convex pagination
 */
export const getDiscoverPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("User must be logged in to discover events");
    }

    const now = new Date();

    // Get all events that are upcoming and public, excluding user's own events
    const result = await ctx.db
      .query("events")
      .filter((q) =>
        q.and(
          q.eq(q.field("visibility"), "public"),
          q.gte(q.field("endDateTime"), now.toISOString()),
          q.neq(q.field("userId"), identity.subject),
        ),
      )
      .order("asc")
      .paginate(args.paginationOpts);

    // Enrich events with user data, comments, and follows
    const enrichedEvents = await Promise.all(
      result.page.map(async (event) => {
        // Get event creator
        const eventUser = await ctx.db
          .query("users")
          .withIndex("by_custom_id", (q) => q.eq("id", event.userId))
          .unique();

        // Get comments for this event
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_event", (q) => q.eq("eventId", event.id))
          .collect();

        // Get follows for this event
        const eventFollowsForEvent = await ctx.db
          .query("eventFollows")
          .withIndex("by_event", (q) => q.eq("eventId", event.id))
          .collect();

        return {
          ...event,
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          createdAt: event.created_at,
          updatedAt: event.updatedAt,
          eventMetadata: event.eventMetadata ?? {},
          user: eventUser
            ? {
                id: eventUser.id,
                username: eventUser.username,
                displayName: eventUser.displayName,
                userImage: eventUser.userImage,
                bio: eventUser.bio,
                emoji: eventUser.emoji,
                createdAt: eventUser.created_at,
                updatedAt: eventUser.updatedAt,
                email: eventUser.email,
                publicEmail: eventUser.publicEmail,
                publicPhone: eventUser.publicPhone,
                publicInsta: eventUser.publicInsta,
                publicWebsite: eventUser.publicWebsite,
                publicMetadata: eventUser.publicMetadata,
                onboardingData: eventUser.onboardingData,
                onboardingCompletedAt: eventUser.onboardingCompletedAt,
              }
            : {
                id: event.userId,
                username: event.userName,
                displayName: event.userName,
                userImage: "",
                bio: null,
                emoji: null,
                createdAt: new Date().toISOString(),
                updatedAt: null,
                email: "",
                publicEmail: null,
                publicPhone: null,
                publicInsta: null,
                publicWebsite: null,
                publicMetadata: null,
                onboardingData: null,
                onboardingCompletedAt: null,
              },
          comments: comments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            userId: comment.userId,
            eventId: comment.eventId,
            oldId: comment.oldId,
            createdAt: comment.created_at,
            updatedAt: comment.updatedAt,
          })),
          eventFollows: eventFollowsForEvent.map((follow) => ({
            userId: follow.userId,
            eventId: follow.eventId,
          })),
        };
      }),
    );

    return {
      ...result,
      page: enrichedEvents,
    };
  },
});

/**
 * Get events for user with pagination
 */
export const getEventsForUser = query({
  args: {
    userName: v.string(),
    filter: v.union(v.literal("upcoming"), v.literal("past")),
    limit: v.number(),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userName, filter, limit, cursor } = args;
    const offset = cursor || 0;

    const result = await Events.getEventsForUserPaginated(
      ctx,
      userName,
      filter,
      limit,
      offset,
    );

    return {
      events: result.events,
      nextCursor: result.hasMore ? offset + limit : undefined,
    };
  },
});

/**
 * Get events for user with Convex pagination (upcoming or past)
 */
export const getEventsForUserPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    userName: v.string(),
    filter: v.union(v.literal("upcoming"), v.literal("past")),
  },
  handler: async (ctx, args) => {
    const { userName, filter } = args;
    const now = new Date();

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", userName))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Get user's own events
    const ownEventsQuery = ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", user.id));

    // Filter by upcoming/past and sort
    let filteredQuery;
    if (filter === "upcoming") {
      filteredQuery = ownEventsQuery
        .filter((q) => q.gte(q.field("endDateTime"), now.toISOString()))
        .order("asc");
    } else {
      filteredQuery = ownEventsQuery
        .filter((q) => q.lt(q.field("endDateTime"), now.toISOString()))
        .order("desc");
    }

    const result = await filteredQuery.paginate(args.paginationOpts);

    // Get followed events for this user
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    // Get followed events that match the filter
    const followedEvents = [];
    for (const follow of eventFollows) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", follow.eventId))
        .unique();

      if (event) {
        const eventDate = new Date(event.endDateTime);
        if (filter === "upcoming" ? eventDate >= now : eventDate < now) {
          followedEvents.push(event);
        }
      }
    }

    // Combine own events with followed events
    const allEvents = [...result.page, ...followedEvents];

    // Sort combined events
    const sortedEvents = allEvents.sort((a, b) => {
      if (filter === "upcoming") {
        return (
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime()
        );
      } else {
        return (
          new Date(b.startDateTime).getTime() -
          new Date(a.startDateTime).getTime()
        );
      }
    });

    // Enrich events with user data, comments, and follows
    const enrichedEvents = await Promise.all(
      sortedEvents.map(async (event) => {
        // Get event creator
        const eventUser = await ctx.db
          .query("users")
          .withIndex("by_custom_id", (q) => q.eq("id", event.userId))
          .unique();

        // Get comments for this event
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_event", (q) => q.eq("eventId", event.id))
          .collect();

        // Get follows for this event
        const eventFollowsForEvent = await ctx.db
          .query("eventFollows")
          .withIndex("by_event", (q) => q.eq("eventId", event.id))
          .collect();

        return {
          ...event,
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          createdAt: event.created_at,
          updatedAt: event.updatedAt,
          eventMetadata: event.eventMetadata ?? {},
          user: eventUser
            ? {
                id: eventUser.id,
                username: eventUser.username,
                displayName: eventUser.displayName,
                userImage: eventUser.userImage,
                bio: eventUser.bio,
                emoji: eventUser.emoji,
                createdAt: eventUser.created_at,
                updatedAt: eventUser.updatedAt,
                email: eventUser.email,
                publicEmail: eventUser.publicEmail,
                publicPhone: eventUser.publicPhone,
                publicInsta: eventUser.publicInsta,
                publicWebsite: eventUser.publicWebsite,
                publicMetadata: eventUser.publicMetadata,
                onboardingData: eventUser.onboardingData,
                onboardingCompletedAt: eventUser.onboardingCompletedAt,
              }
            : {
                id: event.userId,
                username: event.userName,
                displayName: event.userName,
                userImage: "",
                bio: null,
                emoji: null,
                createdAt: new Date().toISOString(),
                updatedAt: null,
                email: "",
                publicEmail: null,
                publicPhone: null,
                publicInsta: null,
                publicWebsite: null,
                publicMetadata: null,
                onboardingData: null,
                onboardingCompletedAt: null,
              },
          comments: comments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            userId: comment.userId,
            eventId: comment.eventId,
            oldId: comment.oldId,
            createdAt: comment.created_at,
            updatedAt: comment.updatedAt,
          })),
          eventFollows: eventFollowsForEvent.map((follow) => ({
            userId: follow.userId,
            eventId: follow.eventId,
          })),
        };
      }),
    );

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
    eventMetadata: v.optional(v.any()),
    comment: v.optional(v.string()),
    lists: v.array(listValidator),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("User must be logged in to create events");
    }

    // Get user info
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    return await Events.createEvent(
      ctx,
      identity.subject,
      user.username,
      args.event,
      args.eventMetadata as Record<string, unknown> | undefined,
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
    eventMetadata: v.optional(v.any()),
    comment: v.optional(v.string()),
    lists: v.array(listValidator),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("User must be logged in to update events");
    }

    // Check if user is admin (you may need to implement this based on your auth system)
    const isAdmin = false; // TODO: Implement admin check

    return await Events.updateEvent(
      ctx,
      identity.subject,
      args.id,
      args.event,
      args.eventMetadata as Record<string, unknown> | undefined,
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
      throw new ConvexError("User must be logged in to delete events");
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
      throw new ConvexError("User must be logged in to follow events");
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
      throw new ConvexError("User must be logged in to unfollow events");
    }

    return await Events.unfollowEvent(ctx, identity.subject, args.id);
  },
});

/**
 * Add event to list
 */
export const addToList = mutation({
  args: {
    eventId: v.string(),
    listId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("User must be logged in to add events to lists");
    }

    await Events.addEventToList(ctx, args.eventId, args.listId);
  },
});

/**
 * Remove event from list
 */
export const removeFromList = mutation({
  args: {
    eventId: v.string(),
    listId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError(
        "User must be logged in to remove events from lists",
      );
    }

    await Events.removeEventFromList(ctx, args.eventId, args.listId);
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
      throw new ConvexError(
        "User must be logged in to change event visibility",
      );
    }

    return await Events.toggleEventVisibility(
      ctx,
      identity.subject,
      args.id,
      args.visibility,
    );
  },
});
