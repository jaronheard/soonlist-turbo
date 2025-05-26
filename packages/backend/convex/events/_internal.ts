import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";

// Helper function to parse date strings and handle timezone conversion
function parseDateTime(
  dateStr: string,
  timeStr: string,
  _timeZone: string,
): string {
  // For now, we'll use a simple approach - in a real implementation you'd use a proper date library
  const date = new Date(`${dateStr}T${timeStr || "00:00"}:00`);
  return date.toISOString();
}

// Helper function to extract fields from event object
function extractEventFields(event: any) {
  return {
    name: event.name || undefined,
    image: event.images?.[0] || null,
    endDate: event.endDate || undefined,
    endTime: event.endTime || undefined,
    location: event.location || undefined,
    timeZone: event.timeZone || undefined,
    startDate: event.startDate || undefined,
    startTime: event.startTime || undefined,
    description: event.description || undefined,
  };
}

/**
 * Get an event with all its relations
 */
export const getEventWithRelations = internalQuery({
  args: { eventId: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", args.eventId))
      .unique();

    if (!event) {
      return null;
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", event.userId))
      .unique();

    if (!user) {
      throw new ConvexError("User not found for event");
    }

    // Get event follows
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_event", (q) => q.eq("eventId", event.id))
      .collect();

    // Get comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_event", (q) => q.eq("eventId", event.id))
      .collect();

    // Get event to lists with list details
    const eventToListsRecords = await ctx.db
      .query("eventToLists")
      .withIndex("by_event", (q) => q.eq("eventId", event.id))
      .collect();

    const eventToLists = [];
    for (const etl of eventToListsRecords) {
      const list = await ctx.db
        .query("lists")
        .withIndex("by_custom_id", (q) => q.eq("id", etl.listId))
        .unique();
      if (list) {
        eventToLists.push({
          ...etl,
          list,
        });
      }
    }

    return {
      ...event,
      user,
      eventFollows,
      comments,
      eventToLists,
    };
  },
});

/**
 * Get all events with relations
 */
export const getAllEventsWithRelations = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx, _args) => {
    const events = await ctx.db.query("events").collect();

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
 * Get upcoming events
 */
export const getUpcomingEvents = internalQuery({
  args: {
    limit: v.optional(v.number()),
    excludeCurrent: v.boolean(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const events = await ctx.db.query("events").collect();

    const filteredEvents = events.filter((event) => {
      if (args.excludeCurrent) {
        return event.endDateTime >= now;
      } else {
        return event.startDateTime >= now;
      }
    });

    // Sort by start date and limit
    const sortedEvents = filteredEvents
      .sort(
        (a, b) =>
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime(),
      )
      .slice(0, args.limit || filteredEvents.length);

    const eventsWithRelations = [];
    for (const event of sortedEvents) {
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

    return eventsWithRelations;
  },
});

/**
 * Get discover events (excluding user's own events)
 */
export const getDiscoverEvents = internalQuery({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    excludeCurrent: v.boolean(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const events = await ctx.db.query("events").collect();

    const filteredEvents = events.filter((event) => {
      // Exclude user's own events
      if (event.userId === args.userId) {
        return false;
      }

      // Only show public events
      if (event.visibility !== "public") {
        return false;
      }

      if (args.excludeCurrent) {
        return event.endDateTime >= now;
      } else {
        return event.startDateTime >= now;
      }
    });

    // Sort by start date and limit
    const sortedEvents = filteredEvents
      .sort(
        (a, b) =>
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime(),
      )
      .slice(0, args.limit || filteredEvents.length);

    const eventsWithRelations = [];
    for (const event of sortedEvents) {
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

    return eventsWithRelations;
  },
});

/**
 * Get discover events with infinite pagination
 */
export const getDiscoverEventsInfinite = internalQuery({
  args: {
    userId: v.string(),
    limit: v.number(),
    cursor: v.number(),
  },
  returns: v.object({
    events: v.array(v.any()),
    nextCursor: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const events = await ctx.db.query("events").collect();

    const filteredEvents = events.filter((event) => {
      // Exclude user's own events
      if (event.userId === args.userId) {
        return false;
      }

      // Only show public events
      if (event.visibility !== "public") {
        return false;
      }

      return event.endDateTime >= now;
    });

    // Sort by start date
    const sortedEvents = filteredEvents.sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime(),
    );

    // Apply pagination
    const paginatedEvents = sortedEvents.slice(
      args.cursor,
      args.cursor + args.limit + 1,
    );

    let nextCursor: number | null = null;
    if (paginatedEvents.length > args.limit) {
      paginatedEvents.pop();
      nextCursor = args.cursor + args.limit;
    }

    const eventsWithRelations = [];
    for (const event of paginatedEvents) {
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

    return {
      events: eventsWithRelations,
      nextCursor,
    };
  },
});

/**
 * Get events for a user with pagination
 */
export const getEventsForUserPaginated = internalQuery({
  args: {
    userName: v.string(),
    filter: v.union(v.literal("upcoming"), v.literal("past")),
    limit: v.number(),
    cursor: v.number(),
  },
  returns: v.object({
    events: v.array(v.any()),
    nextCursor: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.userName))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Get user's own events
    const ownEvents = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    // Get followed events
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    const followedEventIds = eventFollows.map((ef) => ef.eventId);
    const followedEvents = [];
    for (const eventId of followedEventIds) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", eventId))
        .unique();
      if (event) {
        followedEvents.push(event);
      }
    }

    // Combine and filter events
    const allEvents = [...ownEvents, ...followedEvents];
    const filteredEvents = allEvents.filter((event) => {
      if (args.filter === "upcoming") {
        return event.endDateTime >= now;
      } else {
        return event.endDateTime < now;
      }
    });

    // Sort events
    const sortedEvents = filteredEvents.sort((a, b) => {
      if (args.filter === "upcoming") {
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

    // Apply pagination
    const paginatedEvents = sortedEvents.slice(
      args.cursor,
      args.cursor + args.limit + 1,
    );

    let nextCursor: number | null = null;
    if (paginatedEvents.length > args.limit) {
      paginatedEvents.pop();
      nextCursor = args.cursor + args.limit;
    }

    const eventsWithRelations = [];
    for (const event of paginatedEvents) {
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

    return {
      events: eventsWithRelations,
      nextCursor,
    };
  },
});

/**
 * Find possible duplicate events
 */
export const findPossibleDuplicates = internalQuery({
  args: { startDateTime: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const startTime = new Date(args.startDateTime);
    const lowerBound = new Date(startTime.getTime() - 60 * 60 * 1000); // 1 hour before
    const upperBound = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour after

    const events = await ctx.db.query("events").collect();
    const possibleDuplicates = events.filter((event) => {
      const eventStart = new Date(event.startDateTime);
      return eventStart >= lowerBound && eventStart <= upperBound;
    });

    const eventsWithRelations = [];
    for (const event of possibleDuplicates) {
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

    return eventsWithRelations;
  },
});

/**
 * Get user statistics
 */
export const getUserStats = internalQuery({
  args: { userName: v.string() },
  returns: v.object({
    capturesThisWeek: v.number(),
    weeklyGoal: v.number(),
    upcomingEvents: v.number(),
    allTimeEvents: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.userName))
      .unique();

    if (!user) {
      return {
        capturesThisWeek: 0,
        weeklyGoal: 5,
        upcomingEvents: 0,
        allTimeEvents: 0,
      };
    }

    // Get user's own events
    const ownEvents = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    // Get followed events
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    const followedEventIds = eventFollows.map((ef) => ef.eventId);
    const followedEvents = [];
    for (const eventId of followedEventIds) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", eventId))
        .unique();
      if (event) {
        followedEvents.push(event);
      }
    }

    const allEvents = [...ownEvents, ...followedEvents];

    // Calculate stats
    const capturesThisWeek = ownEvents.filter(
      (event) => new Date(event.created_at) >= sevenDaysAgo,
    ).length;

    const upcomingEvents = allEvents.filter(
      (event) => new Date(event.startDateTime) >= now,
    ).length;

    const allTimeEvents = allEvents.length;

    return {
      capturesThisWeek,
      weeklyGoal: 5,
      upcomingEvents,
      allTimeEvents,
    };
  },
});

/**
 * Create an event with all relations
 */
export const createEventWithRelations = internalMutation({
  args: {
    eventId: v.string(),
    userId: v.string(),
    username: v.string(),
    event: v.any(),
    eventMetadata: v.optional(v.any()),
    comment: v.optional(v.string()),
    lists: v.array(v.record(v.string(), v.string())),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Parse dates
    const startTime = args.event.startTime || "00:00";
    const endTime = args.event.endTime || "23:59";
    const timeZone = args.event.timeZone || "America/Los_Angeles";

    const startDateTime = parseDateTime(
      args.event.startDate,
      startTime,
      timeZone,
    );
    const endDateTime = parseDateTime(
      args.event.endDate || args.event.startDate,
      endTime,
      timeZone,
    );

    // Extract fields from event object
    const extractedFields = extractEventFields(args.event);

    // Create event - note: eventMetadata is not in the schema, so we'll store it in the event object
    const eventData = {
      ...args.event,
      ...(args.eventMetadata && { eventMetadata: args.eventMetadata }),
    };

    await ctx.db.insert("events", {
      id: args.eventId,
      userId: args.userId,
      userName: args.username,
      event: eventData,
      startDateTime,
      endDateTime,
      visibility: args.visibility || "public",
      created_at: now,
      updatedAt: null,
      ...extractedFields,
    });

    // Add comment if provided
    if (args.comment && args.comment.length > 0) {
      await ctx.db.insert("comments", {
        content: args.comment,
        eventId: args.eventId,
        userId: args.userId,
        id: Date.now(), // Simple numeric ID
        oldId: null,
        created_at: now,
        updatedAt: null,
      });
    }

    // Add to lists if provided
    if (args.lists.length > 0) {
      for (const list of args.lists) {
        if (list.value) {
          await ctx.db.insert("eventToLists", {
            eventId: args.eventId,
            listId: list.value,
          });
        }
      }
    }

    return null;
  },
});

/**
 * Update an event with all relations
 */
export const updateEventWithRelations = internalMutation({
  args: {
    eventId: v.string(),
    userId: v.string(),
    isAdmin: v.boolean(),
    event: v.any(),
    eventMetadata: v.optional(v.any()),
    comment: v.optional(v.string()),
    lists: v.array(v.record(v.string(), v.string())),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if event exists and user has permission
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", args.eventId))
      .unique();

    if (!event) {
      throw new ConvexError("Event not found");
    }

    if (event.userId !== args.userId && !args.isAdmin) {
      throw new ConvexError("Unauthorized");
    }

    const now = new Date().toISOString();

    // Parse dates
    const startTime = args.event.startTime || "00:00";
    const endTime = args.event.endTime || "23:59";
    const timeZone = args.event.timeZone || "America/Los_Angeles";

    const startDateTime = parseDateTime(
      args.event.startDate,
      startTime,
      timeZone,
    );
    const endDateTime = parseDateTime(
      args.event.endDate || args.event.startDate,
      endTime,
      timeZone,
    );

    // Extract fields from event object
    const extractedFields = extractEventFields(args.event);

    // Update event - store eventMetadata in the event object
    const eventData = {
      ...args.event,
      ...(args.eventMetadata && { eventMetadata: args.eventMetadata }),
    };

    const updateData: any = {
      event: eventData,
      startDateTime,
      endDateTime,
      updatedAt: now,
      ...extractedFields,
    };

    if (args.visibility) {
      updateData.visibility = args.visibility;
    }

    await ctx.db.patch(event._id, updateData);

    // Handle comment
    const existingComment = await ctx.db
      .query("comments")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (args.comment && args.comment.length > 0) {
      if (existingComment) {
        await ctx.db.patch(existingComment._id, {
          content: args.comment,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("comments", {
          content: args.comment,
          eventId: args.eventId,
          userId: args.userId,
          id: Date.now(),
          oldId: null,
          created_at: now,
          updatedAt: null,
        });
      }
    } else if (existingComment) {
      await ctx.db.delete(existingComment._id);
    }

    // Handle lists
    const existingEventToLists = await ctx.db
      .query("eventToLists")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Delete existing relations
    for (const etl of existingEventToLists) {
      await ctx.db.delete(etl._id);
    }

    // Add new relations
    if (args.lists.length > 0) {
      for (const list of args.lists) {
        if (list.value) {
          await ctx.db.insert("eventToLists", {
            eventId: args.eventId,
            listId: list.value,
          });
        }
      }
    }

    return null;
  },
});

/**
 * Delete an event with all relations
 */
export const deleteEventWithRelations = internalMutation({
  args: {
    eventId: v.string(),
    userId: v.string(),
    isAdmin: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if event exists and user has permission
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", args.eventId))
      .unique();

    if (!event) {
      throw new ConvexError("Event not found");
    }

    if (event.userId !== args.userId && !args.isAdmin) {
      throw new ConvexError("Unauthorized");
    }

    // Delete related records
    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const ef of eventFollows) {
      await ctx.db.delete(ef._id);
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    const eventToLists = await ctx.db
      .query("eventToLists")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const etl of eventToLists) {
      await ctx.db.delete(etl._id);
    }

    // Delete the event
    await ctx.db.delete(event._id);

    return null;
  },
});

/**
 * Follow an event
 */
export const followEvent = internalMutation({
  args: {
    eventId: v.string(),
    userId: v.string(),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    // Check if already following
    const existingFollow = await ctx.db
      .query("eventFollows")
      .withIndex("by_user_and_event", (q) =>
        q.eq("userId", args.userId).eq("eventId", args.eventId),
      )
      .unique();

    if (!existingFollow) {
      await ctx.db.insert("eventFollows", {
        userId: args.userId,
        eventId: args.eventId,
      });
    }

    // Return the event with relations
    return await ctx.runQuery(internal.events._internal.getEventWithRelations, {
      eventId: args.eventId,
    });
  },
});

/**
 * Unfollow an event
 */
export const unfollowEvent = internalMutation({
  args: {
    eventId: v.string(),
    userId: v.string(),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    // Find and delete the follow relationship
    const existingFollow = await ctx.db
      .query("eventFollows")
      .withIndex("by_user_and_event", (q) =>
        q.eq("userId", args.userId).eq("eventId", args.eventId),
      )
      .unique();

    if (existingFollow) {
      await ctx.db.delete(existingFollow._id);
    }

    // Return the event with relations
    return await ctx.runQuery(internal.events._internal.getEventWithRelations, {
      eventId: args.eventId,
    });
  },
});

/**
 * Add event to list
 */
export const addEventToList = internalMutation({
  args: {
    eventId: v.string(),
    listId: v.string(),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if relation already exists
    const existing = await ctx.db
      .query("eventToLists")
      .withIndex("by_event_and_list", (q) =>
        q.eq("eventId", args.eventId).eq("listId", args.listId),
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("eventToLists", {
        eventId: args.eventId,
        listId: args.listId,
      });
    }

    return null;
  },
});

/**
 * Remove event from list
 */
export const removeEventFromList = internalMutation({
  args: {
    eventId: v.string(),
    listId: v.string(),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("eventToLists")
      .withIndex("by_event_and_list", (q) =>
        q.eq("eventId", args.eventId).eq("listId", args.listId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return null;
  },
});

/**
 * Toggle event visibility
 */
export const toggleEventVisibility = internalMutation({
  args: {
    eventId: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", args.eventId))
      .unique();

    if (!event) {
      throw new ConvexError("Event not found");
    }

    if (event.userId !== args.userId) {
      throw new ConvexError("You don't have permission to modify this event");
    }

    await ctx.db.patch(event._id, {
      visibility: args.visibility,
      updatedAt: new Date().toISOString(),
    });

    return null;
  },
});
