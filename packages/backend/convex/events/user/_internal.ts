import { ConvexError, v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalQuery } from "../../_generated/server";

/**
 * Get all events for a user
 */
export const getEventsForUser = internalQuery({
  args: { userName: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.userName))
      .unique();

    if (!user) {
      return [];
    }

    // Get user's own events
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    const eventsWithRelations = [];
    for (const event of events) {
      const eventWithRelations = await ctx.runQuery(
        internal.events._internal.getEventWithRelations,
        {
          eventId: event.id,
        },
      );
      if (eventWithRelations) {
        eventsWithRelations.push(eventWithRelations);
      }
    }

    // Sort by start date
    return eventsWithRelations.sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime(),
    );
  },
});

/**
 * Get upcoming events for a user (created and saved)
 */
export const getUpcomingEventsForUser = internalQuery({
  args: { userName: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.userName))
      .unique();

    if (!user) {
      return [];
    }

    // Get user's created events
    const createdEvents = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    const upcomingCreatedEvents = createdEvents.filter(
      (event) => new Date(event.startDateTime) >= oneDayAgo,
    );

    // Get user's followed events
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    const followedEvents = [];
    for (const ef of eventFollows) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", ef.eventId))
        .unique();
      if (event && new Date(event.startDateTime) >= oneDayAgo) {
        followedEvents.push(event);
      }
    }

    // Combine and deduplicate
    const allEvents = [...upcomingCreatedEvents, ...followedEvents];
    const uniqueEvents = allEvents.filter(
      (event, index, self) =>
        index === self.findIndex((e) => e.id === event.id),
    );

    const eventsWithRelations = [];
    for (const event of uniqueEvents) {
      const eventWithRelations = await ctx.runQuery(
        internal.events._internal.getEventWithRelations,
        {
          eventId: event.id,
        },
      );
      if (eventWithRelations) {
        eventsWithRelations.push(eventWithRelations);
      }
    }

    // Sort by start date
    return eventsWithRelations.sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime(),
    );
  },
});

/**
 * Get events created by a user
 */
export const getCreatedEventsForUser = internalQuery({
  args: { userName: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.userName))
      .unique();

    if (!user) {
      return [];
    }

    // Get user's own events
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    const eventsWithRelations = [];
    for (const event of events) {
      const eventWithRelations = await ctx.runQuery(
        internal.events._internal.getEventWithRelations,
        {
          eventId: event.id,
        },
      );
      if (eventWithRelations) {
        eventsWithRelations.push(eventWithRelations);
      }
    }

    // Sort by start date
    return eventsWithRelations.sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime(),
    );
  },
});

/**
 * Get events that a user is following (from lists, events, and users)
 */
export const getFollowingEventsForUser = internalQuery({
  args: { userName: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.userName))
      .unique();

    if (!user) {
      return [];
    }

    const allEvents = [];

    // Get events from followed event follows
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    for (const ef of eventFollows) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", ef.eventId))
        .unique();
      if (event) {
        allEvents.push(event);
      }
    }

    // Get events from followed lists
    const listFollows = await ctx.db
      .query("listFollows")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    for (const lf of listFollows) {
      const eventToLists = await ctx.db
        .query("eventToLists")
        .withIndex("by_list", (q) => q.eq("listId", lf.listId))
        .collect();

      for (const etl of eventToLists) {
        const event = await ctx.db
          .query("events")
          .withIndex("by_custom_id", (q) => q.eq("id", etl.eventId))
          .unique();
        if (event) {
          allEvents.push(event);
        }
      }
    }

    // Get events from followed users
    const userFollows = await ctx.db
      .query("userFollows")
      .withIndex("by_follower", (q) => q.eq("followerId", user.id))
      .collect();

    for (const uf of userFollows) {
      const followedUserEvents = await ctx.db
        .query("events")
        .withIndex("by_user", (q) => q.eq("userId", uf.followingId))
        .collect();

      allEvents.push(...followedUserEvents);
    }

    // Deduplicate events
    const uniqueEvents = allEvents.filter(
      (event, index, self) =>
        index === self.findIndex((e) => e.id === event.id),
    );

    const eventsWithRelations = [];
    for (const event of uniqueEvents) {
      const eventWithRelations = await ctx.runQuery(
        internal.events._internal.getEventWithRelations,
        {
          eventId: event.id,
        },
      );
      if (eventWithRelations) {
        eventsWithRelations.push(eventWithRelations);
      }
    }

    // Sort by start date
    return eventsWithRelations.sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime(),
    );
  },
});

/**
 * Get upcoming events that a user is following
 */
export const getFollowingUpcomingEventsForUser = internalQuery({
  args: { userName: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.userName))
      .unique();

    if (!user) {
      return [];
    }

    const allEventIds = new Set<string>();

    // Get events from followed event follows
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    eventFollows.forEach((ef) => allEventIds.add(ef.eventId));

    // Get events from followed lists
    const listFollows = await ctx.db
      .query("listFollows")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    for (const lf of listFollows) {
      const eventToLists = await ctx.db
        .query("eventToLists")
        .withIndex("by_list", (q) => q.eq("listId", lf.listId))
        .collect();

      eventToLists.forEach((etl) => allEventIds.add(etl.eventId));
    }

    // Get events from followed users
    const userFollows = await ctx.db
      .query("userFollows")
      .withIndex("by_follower", (q) => q.eq("followerId", user.id))
      .collect();

    for (const uf of userFollows) {
      const followedUserEvents = await ctx.db
        .query("events")
        .withIndex("by_user", (q) => q.eq("userId", uf.followingId))
        .collect();

      followedUserEvents.forEach((event) => allEventIds.add(event.id));
    }

    // Get upcoming events
    const upcomingEvents = [];
    for (const eventId of allEventIds) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", eventId))
        .unique();

      if (event && event.startDateTime > now) {
        upcomingEvents.push(event);
      }
    }

    const eventsWithRelations = [];
    for (const event of upcomingEvents) {
      const eventWithRelations = await ctx.runQuery(
        internal.events._internal.getEventWithRelations,
        {
          eventId: event.id,
        },
      );
      if (eventWithRelations) {
        eventsWithRelations.push(eventWithRelations);
      }
    }

    // Sort by start date
    return eventsWithRelations.sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime(),
    );
  },
});

/**
 * Get saved events for a user
 */
export const getSavedEventsForUser = internalQuery({
  args: { userName: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.userName))
      .unique();

    if (!user) {
      return [];
    }

    // Get user's followed events
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    const eventsWithRelations = [];
    for (const ef of eventFollows) {
      const eventWithRelations = await ctx.runQuery(
        internal.events._internal.getEventWithRelations,
        {
          eventId: ef.eventId,
        },
      );
      if (eventWithRelations) {
        eventsWithRelations.push(eventWithRelations);
      }
    }

    // Sort by start date
    return eventsWithRelations.sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime(),
    );
  },
});

/**
 * Get saved event IDs for a user
 */
export const getSavedEventIdsForUser = internalQuery({
  args: { userName: v.string() },
  returns: v.array(v.object({ id: v.string() })),
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.userName))
      .unique();

    if (!user) {
      return [];
    }

    // Get user's followed events
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    const eventIds = [];
    for (const ef of eventFollows) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", ef.eventId))
        .unique();

      if (event) {
        eventIds.push({ id: event.id });
      }
    }

    return eventIds;
  },
});
