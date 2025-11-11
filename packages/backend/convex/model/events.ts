import { Temporal } from "@js-temporal/polyfill";
import { ConvexError } from "convex/values";

import type { EventMetadataLoose } from "@soonlist/cal";

import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  eventFollowsAggregate,
  eventsByCreation,
  eventsByStartTime,
  userFeedsAggregate,
} from "../aggregates";
import { DEFAULT_TIMEZONE } from "../constants";
import { generateNumericId, generatePublicId } from "../utils";

// Type for event data (based on AddToCalendarButtonProps)
interface EventData {
  name: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  timeZone?: string;
  location?: string;
  description?: string;
  images?: string[];
  [key: string]: unknown;
}

// Helper function to filter duplicates
function filterDuplicates<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

// Helper used by paginated queries to hydrate events
export async function enrichEventsAndFilterNulls(
  ctx: QueryCtx,
  events: { id: string }[],
) {
  const enrichedEventsWithNulls = await Promise.all(
    events.map(async (event) => {
      return await getEventById(ctx, event.id);
    }),
  );

  return enrichedEventsWithNulls.filter(
    (event): event is NonNullable<typeof event> => event !== null,
  );
}

// Helper function to parse date/time with timezone using Temporal
function parseDateTime(date: string, time: string, timeZone: string): Date {
  // Validate inputs
  if (!date || !time) {
    throw new ConvexError(
      `Invalid date or time: date="${date}", time="${time}"`,
    );
  }

  // Validate date format (YYYY-MM-DD)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(date)) {
    throw new ConvexError(
      `Invalid date format: "${date}". Expected YYYY-MM-DD`,
    );
  }

  // Validate time format (HH:MM or HH:MM:SS)
  const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  if (!timePattern.test(time)) {
    throw new ConvexError(
      `Invalid time format: "${time}". Expected HH:MM or HH:MM:SS`,
    );
  }

  try {
    // Ensure time has seconds
    const timeWithSeconds =
      time.includes(":") && time.split(":").length === 3 ? time : `${time}:00`;

    // Use Temporal to properly handle timezone conversion
    const zonedDateTime = Temporal.ZonedDateTime.from(
      `${date}T${timeWithSeconds}[${timeZone || DEFAULT_TIMEZONE}]`,
    );

    // Convert to a regular Date object
    return new Date(zonedDateTime.epochMilliseconds);
  } catch (error) {
    // Fallback to simplified approach if Temporal fails
    console.warn(
      "Temporal parsing failed, falling back to simple Date parsing:",
      error,
    );

    const timeWithSeconds =
      time.includes(":") && time.split(":").length === 3 ? time : `${time}:00`;
    const dateTimeString = `${date}T${timeWithSeconds}`;
    const parsedDate = new Date(dateTimeString);

    // Validate that the Date object is valid
    if (isNaN(parsedDate.getTime())) {
      throw new ConvexError(
        `Invalid date/time combination: "${dateTimeString}"`,
      );
    }

    return parsedDate;
  }
}

/**
 * Get events for a specific user by username
 */
export async function getEventsForUser(ctx: QueryCtx, userName: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return [];
  }

  const events = await ctx.db
    .query("events")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .collect();

  // Sort by start date time
  return events.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );
}

/**
 * Get upcoming events for a user (created + saved)
 */
export async function getUpcomingEventsForUser(
  ctx: QueryCtx,
  userName: string,
) {
  const now = new Date(new Date().getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return [];
  }

  // Get created events
  const createdEvents = await ctx.db
    .query("events")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .filter((q) => q.gte(q.field("startDateTime"), now.toISOString()))
    .collect();

  // Get saved events
  const eventFollows = await ctx.db
    .query("eventFollows")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .collect();

  const savedEvents = [];
  for (const follow of eventFollows) {
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", follow.eventId))
      .unique();

    if (event && new Date(event.startDateTime) > now) {
      savedEvents.push(event);
    }
  }

  const allEvents = [...createdEvents, ...savedEvents];
  return allEvents.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );
}

/**
 * Get events that a user is following (from lists, users, and individual events)
 */
export async function getFollowingEventsForUser(
  ctx: QueryCtx,
  userName: string,
) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return [];
  }

  const allEvents: Doc<"events">[] = [];

  // Get events from followed individual events
  const eventFollows = await ctx.db
    .query("eventFollows")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .collect();

  for (const follow of eventFollows) {
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", follow.eventId))
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

  for (const listFollow of listFollows) {
    const eventToLists = await ctx.db
      .query("eventToLists")
      .withIndex("by_list", (q) => q.eq("listId", listFollow.listId))
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

  for (const userFollow of userFollows) {
    const followedUserEvents = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", userFollow.followingId))
      .collect();

    allEvents.push(...followedUserEvents);
  }

  const uniqueEvents = filterDuplicates(allEvents);
  return uniqueEvents.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );
}

/**
 * Get upcoming events from following (optimized version)
 */
export async function getFollowingUpcomingEventsForUser(
  ctx: QueryCtx,
  userName: string,
) {
  const now = new Date();

  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return [];
  }

  const eventIds = new Set<string>();

  // Collect event IDs from all sources
  const eventFollows = await ctx.db
    .query("eventFollows")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .collect();

  eventFollows.forEach((ef) => eventIds.add(ef.eventId));

  const listFollows = await ctx.db
    .query("listFollows")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .collect();

  for (const lf of listFollows) {
    const eventToLists = await ctx.db
      .query("eventToLists")
      .withIndex("by_list", (q) => q.eq("listId", lf.listId))
      .collect();
    eventToLists.forEach((etl) => eventIds.add(etl.eventId));
  }

  const userFollows = await ctx.db
    .query("userFollows")
    .withIndex("by_follower", (q) => q.eq("followerId", user.id))
    .collect();

  for (const uf of userFollows) {
    const followedUserEvents = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", uf.followingId))
      .collect();
    followedUserEvents.forEach((e) => eventIds.add(e.id));
  }

  // Fetch upcoming events
  const upcomingEvents = [];
  for (const eventId of eventIds) {
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", eventId))
      .unique();

    if (event && new Date(event.startDateTime) > now) {
      upcomingEvents.push(event);
    }
  }

  return upcomingEvents.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );
}

/**
 * Get saved events for a user
 */
export async function getSavedEventsForUser(ctx: QueryCtx, userName: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return [];
  }

  const eventFollows = await ctx.db
    .query("eventFollows")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .collect();

  const savedEvents = [];
  for (const follow of eventFollows) {
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", follow.eventId))
      .unique();
    if (event) {
      savedEvents.push(event);
    }
  }

  return savedEvents.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );
}

/**
 * Get saved event IDs for a user
 */
export async function getSavedEventIdsForUser(ctx: QueryCtx, userName: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return [];
  }

  const eventFollows = await ctx.db
    .query("eventFollows")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .collect();

  return eventFollows.map((follow) => ({ id: follow.eventId }));
}

/**
 * Get possible duplicate events based on start time
 */
export async function getPossibleDuplicateEvents(
  ctx: QueryCtx,
  startDateTime: Date,
) {
  const startDateTimeLowerBound = new Date(startDateTime);
  startDateTimeLowerBound.setHours(startDateTime.getHours() - 1);
  const startDateTimeUpperBound = new Date(startDateTime);
  startDateTimeUpperBound.setHours(startDateTime.getHours() + 1);

  // Use range query with index instead of fetching all events and filtering
  const events = await ctx.db
    .query("events")
    .withIndex("by_startDateTime", (q) =>
      q
        .gte("startDateTime", startDateTimeLowerBound.toISOString())
        .lte("startDateTime", startDateTimeUpperBound.toISOString()),
    )
    .collect();

  return events;
}

/**
 * Get a single event by ID
 */
export async function getEventById(ctx: QueryCtx, eventId: string) {
  const event = await ctx.db
    .query("events")
    .withIndex("by_custom_id", (q) => q.eq("id", eventId))
    .unique();

  if (!event) {
    return null;
  }

  // Get related data
  const user = await ctx.db
    .query("users")
    .withIndex("by_custom_id", (q) => q.eq("id", event.userId))
    .unique();

  const eventFollows = await ctx.db
    .query("eventFollows")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const comments = await ctx.db
    .query("comments")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const eventToLists = await ctx.db
    .query("eventToLists")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const lists = [];
  for (const etl of eventToLists) {
    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", etl.listId))
      .unique();
    if (list) {
      lists.push(list);
    }
  }

  // If the user is not found, still return the event but log a warning
  if (!user) {
    console.warn(
      `User not found for event ${eventId} with userId ${event.userId}`,
    );
  }

  return {
    ...event,
    user,
    eventFollows,
    comments,
    eventToLists,
    lists,
  };
}

/**
 * Get all events
 */
export async function getAllEvents(ctx: QueryCtx) {
  const events = await ctx.db.query("events").collect();
  return events.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );
}

/**
 * Get next upcoming events
 */
export async function getNextEvents(
  ctx: QueryCtx,
  limit?: number,
  excludeCurrent?: boolean,
) {
  const now = new Date();

  // Use range query with index instead of fetching all events and filtering
  const query = ctx.db.query("events").withIndex("by_startDateTime", (q) => {
    if (excludeCurrent) {
      // Filter by endDateTime for excludeCurrent, but we need to fetch and filter
      // since we don't have an endDateTime index
      return q.gte("startDateTime", now.toISOString());
    } else {
      return q.gte("startDateTime", now.toISOString());
    }
  });

  const events = await query.collect();

  // Additional filtering for excludeCurrent since we can't efficiently query endDateTime
  const filteredEvents = excludeCurrent
    ? events.filter((event) => new Date(event.endDateTime) >= now)
    : events;

  const sortedEvents = filteredEvents.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );

  return limit ? sortedEvents.slice(0, limit) : sortedEvents;
}

/**
 * Get discover events (excluding user's own events)
 */
export async function getDiscoverEvents(
  ctx: QueryCtx,
  userId: string,
  limit?: number,
  excludeCurrent?: boolean,
) {
  const now = new Date();

  // Use compound index to filter by visibility and startDateTime efficiently
  const query = ctx.db
    .query("events")
    .withIndex("by_visibility_and_startDateTime", (q) =>
      q.eq("visibility", "public").gte("startDateTime", now.toISOString()),
    );

  const events = await query.collect();

  const filteredEvents = events.filter((event) => {
    if (event.userId === userId) return false;

    if (excludeCurrent) {
      return new Date(event.endDateTime) >= now;
    }
    return true; // visibility and startDateTime filters already applied in query
  });

  const sortedEvents = filteredEvents.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );

  return limit ? sortedEvents.slice(0, limit) : sortedEvents;
}

/**
 * Create a new event
 */
export async function createEvent(
  ctx: MutationCtx,
  userId: string,
  userName: string,
  eventData: EventData,
  eventMetadata?: EventMetadataLoose,
  comment?: string,
  lists?: { value: string }[],
  visibility?: "public" | "private",
  batchId?: string,
) {
  const eventId = generatePublicId();

  // Parse dates and times
  const startTime = eventData.startTime || "00:00";
  const endTime = eventData.endTime || "23:59";
  const timeZone = eventData.timeZone || DEFAULT_TIMEZONE;

  const startDateTime = parseDateTime(eventData.startDate, startTime, timeZone);
  const endDateTime = parseDateTime(eventData.endDate, endTime, timeZone);

  // Create the event
  const eventDocId = await ctx.db.insert("events", {
    id: eventId,
    userId,
    userName,
    event: eventData,
    eventMetadata,
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    visibility: visibility || "public",
    created_at: new Date().toISOString(),
    updatedAt: null,
    // Extract fields for easier querying
    name: eventData.name,
    image: eventData.images?.[0] || null,
    endDate: eventData.endDate,
    endTime,
    location: eventData.location,
    timeZone,
    startDate: eventData.startDate,
    startTime,
    description: eventData.description,
    batchId,
  });

  // Sync with aggregates for efficient stats
  const createdEvent = await ctx.db.get(eventDocId);
  if (createdEvent) {
    await eventsByCreation.replaceOrInsert(ctx, createdEvent, createdEvent);
    await eventsByStartTime.replaceOrInsert(ctx, createdEvent, createdEvent);
  }

  // Add comment if provided
  if (comment && comment.length > 0) {
    await ctx.db.insert("comments", {
      content: comment,
      userId,
      eventId,
      id: generateNumericId(),
      oldId: null,
      created_at: new Date().toISOString(),
      updatedAt: null,
    });
  }

  // Add to lists if provided
  if (lists && lists.length > 0) {
    for (const list of lists) {
      if (list.value) {
        await ctx.db.insert("eventToLists", {
          eventId,
          listId: list.value,
        });
      }
    }
  }

  // Add event to feeds
  await ctx.runMutation(internal.feedHelpers.updateEventInFeeds, {
    eventId,
    userId,
    visibility: visibility || "public",
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
  });

  // Add event to list followers' feeds (updateEventInFeeds handles this, but we ensure it's called for new lists)
  if (lists && lists.length > 0 && (visibility || "public") === "public") {
    for (const list of lists) {
      if (list.value) {
        await ctx.runMutation(
          internal.feedHelpers.addEventToListFollowersFeeds,
          {
            eventId,
            listId: list.value,
          },
        );
      }
    }
  }

  return { id: eventId };
}

/**
 * Update an existing event
 */
export async function updateEvent(
  ctx: MutationCtx,
  userId: string,
  eventId: string,
  eventData: EventData,
  eventMetadata?: Record<string, unknown>,
  comment?: string,
  lists?: { value: string }[],
  visibility?: "public" | "private",
  isAdmin?: boolean,
) {
  // Check if user owns the event or is admin
  const existingEvent = await ctx.db
    .query("events")
    .withIndex("by_custom_id", (q) => q.eq("id", eventId))
    .unique();

  if (!existingEvent) {
    throw new ConvexError("Event not found");
  }

  if (existingEvent.userId !== userId && !isAdmin) {
    throw new ConvexError("Unauthorized");
  }

  // Parse dates and times
  const startTime = eventData.startTime || "00:00";
  const endTime = eventData.endTime || "23:59";
  const timeZone = eventData.timeZone || DEFAULT_TIMEZONE;

  // Validate required date fields
  if (!eventData.startDate) {
    throw new ConvexError("Start date is required");
  }
  if (!eventData.endDate) {
    throw new ConvexError("End date is required");
  }

  const startDateTime = parseDateTime(eventData.startDate, startTime, timeZone);
  const endDateTime = parseDateTime(eventData.endDate, endTime, timeZone);

  // Update the event
  await ctx.db.patch(existingEvent._id, {
    event: eventData,
    eventMetadata,
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    ...(visibility && { visibility }),
    updatedAt: new Date().toISOString(),
    // Update extracted fields
    name: eventData.name,
    image: eventData.images?.[0] || null,
    endDate: eventData.endDate,
    endTime,
    location: eventData.location,
    timeZone,
    startDate: eventData.startDate,
    startTime,
    description: eventData.description,
  });

  // Get updated event for aggregates
  const updatedEvent = await ctx.db.get(existingEvent._id);
  if (updatedEvent) {
    // Sync with aggregates (replace updates the sort keys)
    await eventsByCreation.replaceOrInsert(ctx, existingEvent, updatedEvent);
    await eventsByStartTime.replaceOrInsert(ctx, existingEvent, updatedEvent);
  }

  // Handle comment
  const existingComment = await ctx.db
    .query("comments")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .filter((q) => q.eq(q.field("userId"), userId))
    .unique();

  if (comment && comment.length > 0) {
    if (existingComment) {
      await ctx.db.patch(existingComment._id, {
        content: comment,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("comments", {
        content: comment,
        userId,
        eventId,
        id: generateNumericId(),
        oldId: null,
        created_at: new Date().toISOString(),
        updatedAt: null,
      });
    }
  } else if (existingComment) {
    await ctx.db.delete(existingComment._id);
  }

  // Handle lists
  const existingEventToLists = await ctx.db
    .query("eventToLists")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  // Track which lists were removed and which were added
  const existingListIds = new Set(
    existingEventToLists.map((etl) => etl.listId),
  );
  const newListIds = lists
    ? new Set(lists.filter((l) => l.value).map((l) => l.value))
    : new Set<string>();

  // Delete existing list associations that are no longer in the new list
  for (const etl of existingEventToLists) {
    if (!newListIds.has(etl.listId)) {
      await ctx.db.delete(etl._id);
      // Remove from followers' feeds
      await ctx.runMutation(
        internal.feedHelpers.removeEventFromListFollowersFeeds,
        {
          eventId,
          listId: etl.listId,
        },
      );
    }
  }

  // Add new list associations
  if (lists && lists.length > 0) {
    for (const list of lists) {
      if (list.value && !existingListIds.has(list.value)) {
        await ctx.db.insert("eventToLists", {
          eventId,
          listId: list.value,
        });
        // Add to followers' feeds if event is public
        if ((visibility || existingEvent.visibility) === "public") {
          await ctx.runMutation(
            internal.feedHelpers.addEventToListFollowersFeeds,
            {
              eventId,
              listId: list.value,
            },
          );
        }
      }
    }
  }

  // Update feeds if visibility or time changed
  const visibilityChanged =
    visibility && existingEvent.visibility !== visibility;
  const timeChanged =
    existingEvent.startDateTime !== startDateTime.toISOString();

  if (visibilityChanged || timeChanged) {
    // If changing to private, remove from discover feed
    if (visibility === "private" && existingEvent.visibility === "public") {
      await ctx.runMutation(internal.feedHelpers.removeEventFromFeeds, {
        eventId,
        keepCreatorFeed: true,
      });
    }

    // Update event in feeds with new visibility and/or time
    await ctx.runMutation(internal.feedHelpers.updateEventInFeeds, {
      eventId,
      userId: existingEvent.userId,
      visibility: visibility || existingEvent.visibility,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
    });
  }

  return { id: eventId };
}

/**
 * Delete an event
 */
export async function deleteEvent(
  ctx: MutationCtx,
  userId: string,
  eventId: string,
  isAdmin?: boolean,
) {
  const event = await ctx.db
    .query("events")
    .withIndex("by_custom_id", (q) => q.eq("id", eventId))
    .unique();

  if (!event) {
    throw new ConvexError("Event not found");
  }

  if (event.userId !== userId && !isAdmin) {
    throw new ConvexError("Unauthorized");
  }

  // Delete related records
  const eventFollows = await ctx.db
    .query("eventFollows")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const comments = await ctx.db
    .query("comments")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const eventToLists = await ctx.db
    .query("eventToLists")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  // Delete all related records
  for (const ef of eventFollows) {
    // Remove from eventFollows aggregate before deleting
    await eventFollowsAggregate.deleteIfExists(ctx, ef);
    await ctx.db.delete(ef._id);
  }

  for (const comment of comments) {
    await ctx.db.delete(comment._id);
  }

  for (const etl of eventToLists) {
    await ctx.db.delete(etl._id);
  }

  // Remove event from all feeds
  await ctx.runMutation(internal.feedHelpers.removeEventFromFeeds, {
    eventId,
    keepCreatorFeed: false,
  });

  // Remove from aggregates before deleting the event
  await eventsByCreation.deleteIfExists(ctx, event);
  await eventsByStartTime.deleteIfExists(ctx, event);

  // Delete the event
  await ctx.db.delete(event._id);

  return { id: eventId };
}

/**
 * Follow an event
 */
export async function followEvent(
  ctx: MutationCtx,
  userId: string,
  eventId: string,
) {
  // Check if already following
  const existingFollow = await ctx.db
    .query("eventFollows")
    .withIndex("by_user_and_event", (q) =>
      q.eq("userId", userId).eq("eventId", eventId),
    )
    .unique();

  if (!existingFollow) {
    const followId = await ctx.db.insert("eventFollows", {
      userId,
      eventId,
    });

    // Sync with eventFollows aggregate
    const createdFollow = await ctx.db.get(followId);
    if (createdFollow) {
      await eventFollowsAggregate.replaceOrInsert(
        ctx,
        createdFollow,
        createdFollow,
      );
    }

    // Get event to add to user's feed
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", eventId))
      .unique();

    if (event) {
      // Add to user's feed
      await ctx.runMutation(internal.feedHelpers.addEventToUserFeed, {
        userId,
        eventId,
      });
    }
  }

  return await getEventById(ctx, eventId);
}

/**
 * Unfollow an event
 */
export async function unfollowEvent(
  ctx: MutationCtx,
  userId: string,
  eventId: string,
) {
  const existingFollow = await ctx.db
    .query("eventFollows")
    .withIndex("by_user_and_event", (q) =>
      q.eq("userId", userId).eq("eventId", eventId),
    )
    .unique();

  if (existingFollow) {
    // Remove from eventFollows aggregate before deleting
    await eventFollowsAggregate.deleteIfExists(ctx, existingFollow);
    await ctx.db.delete(existingFollow._id);

    // Remove from user's feed
    const feedId = `user_${userId}`;
    const feedEntry = await ctx.db
      .query("userFeeds")
      .withIndex("by_feed_event", (q) =>
        q.eq("feedId", feedId).eq("eventId", eventId),
      )
      .unique();

    if (feedEntry) {
      await ctx.db.delete(feedEntry._id);
    }
  }

  return await getEventById(ctx, eventId);
}

/**
 * Add event to list
 */
export async function addEventToList(
  ctx: MutationCtx,
  eventId: string,
  listId: string,
  userId: string,
) {
  const list = await ctx.db
    .query("lists")
    .withIndex("by_custom_id", (q) => q.eq("id", listId))
    .first();

  if (!list) {
    throw new ConvexError("List not found");
  }

  const contribution = list.contribution ?? "open";

  if (list.userId === userId) {
    // Owner can always contribute
  } else if (contribution === "open") {
    // Open mode: anyone can contribute
  } else {
    // Restricted/owner modes: only members can contribute
    const membership = await ctx.db
      .query("listMembers")
      .withIndex("by_list_and_user", (q) =>
        q.eq("listId", listId).eq("userId", userId),
      )
      .first();

    if (!membership) {
      throw new ConvexError(
        "Cannot add event to list: contribution is restricted to members only",
      );
    }
  }

  // Check if already in list
  const existing = await ctx.db
    .query("eventToLists")
    .withIndex("by_event_and_list", (q) =>
      q.eq("eventId", eventId).eq("listId", listId),
    )
    .unique();

  if (!existing) {
    await ctx.db.insert("eventToLists", {
      eventId,
      listId,
    });

    // Add event to followers' feeds
    await ctx.runMutation(internal.feedHelpers.addEventToListFollowersFeeds, {
      eventId,
      listId,
    });
  }
}

/**
 * Remove event from list
 */
export async function removeEventFromList(
  ctx: MutationCtx,
  eventId: string,
  listId: string,
  userId: string,
) {
  const list = await ctx.db
    .query("lists")
    .withIndex("by_custom_id", (q) => q.eq("id", listId))
    .first();

  if (!list) {
    throw new ConvexError("List not found");
  }

  const contribution = list.contribution ?? "open";

  if (list.userId === userId) {
    // Owner can always contribute
  } else if (contribution === "open") {
    // Open mode: anyone can contribute
  } else {
    // Restricted/owner modes: only members can contribute
    const membership = await ctx.db
      .query("listMembers")
      .withIndex("by_list_and_user", (q) =>
        q.eq("listId", listId).eq("userId", userId),
      )
      .first();

    if (!membership) {
      throw new ConvexError(
        "Cannot remove event from list: contribution is restricted to members only",
      );
    }
  }

  const existing = await ctx.db
    .query("eventToLists")
    .withIndex("by_event_and_list", (q) =>
      q.eq("eventId", eventId).eq("listId", listId),
    )
    .unique();

  if (existing) {
    await ctx.db.delete(existing._id);

    // Remove event from followers' feeds
    await ctx.runMutation(
      internal.feedHelpers.removeEventFromListFollowersFeeds,
      {
        eventId,
        listId,
      },
    );
  }
}

/**
 * Toggle event visibility
 */
export async function toggleEventVisibility(
  ctx: MutationCtx,
  userId: string,
  eventId: string,
  visibility: "public" | "private",
) {
  const event = await ctx.db
    .query("events")
    .withIndex("by_custom_id", (q) => q.eq("id", eventId))
    .unique();

  if (!event) {
    throw new ConvexError("Event not found");
  }

  if (event.userId !== userId) {
    throw new ConvexError("You don't have permission to modify this event");
  }

  await ctx.db.patch(event._id, {
    visibility,
    updatedAt: new Date().toISOString(),
  });

  // Update feeds based on visibility change
  if (event.visibility !== visibility) {
    // If changing to private, remove from public feeds
    if (visibility === "private") {
      await ctx.runMutation(internal.feedHelpers.removeEventFromFeeds, {
        eventId,
        keepCreatorFeed: true,
      });
    } else {
      // If changing to public, add to feeds
      await ctx.runMutation(internal.feedHelpers.updateEventInFeeds, {
        eventId,
        userId: event.userId,
        visibility,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
      });
    }
  }

  return event;
}

/**
 * Get user stats using aggregates for O(log(n)) performance
 */
export async function getUserStats(ctx: QueryCtx, userName: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return {
      capturesThisWeek: 0,
      weeklyGoal: 5,
      upcomingEvents: 0,
      allTimeEvents: 0,
    };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const nowMs = now.getTime();
  const sevenDaysAgoMs = sevenDaysAgo.getTime();

  // Run all aggregate queries in parallel for better performance
  const feedId = `user_${user.id}`;
  const [capturesThisWeek, allTimeOwnEvents, totalFollows, upcomingEvents] =
    await Promise.all([
      // Count events created in last 7 days using aggregate - O(log(n))
      eventsByCreation.count(ctx, {
        namespace: user.id,
        bounds: {
          lower: { key: sevenDaysAgoMs, inclusive: true },
          upper: { key: nowMs, inclusive: true },
        },
      }),

      // Count all-time events (own) using aggregate - O(log(n))
      eventsByCreation.count(ctx, {
        namespace: user.id,
      }),

      // Count total event follows using aggregate - O(log(n))
      eventFollowsAggregate.count(ctx, {
        namespace: user.id,
      }),

      // Count upcoming events (own + followed) using userFeeds aggregate - O(log(n))
      userFeedsAggregate.count(ctx, {
        namespace: feedId,
        bounds: {
          lower: { key: 0, inclusive: true },
          upper: { key: 0, inclusive: true },
        },
      }),
    ]);
  const allTimeEvents = allTimeOwnEvents + totalFollows;

  return {
    capturesThisWeek,
    weeklyGoal: 5,
    upcomingEvents,
    allTimeEvents,
  };
}

/**
 * Get events for user with pagination (upcoming or past)
 */
export async function getEventsForUserPaginated(
  ctx: QueryCtx,
  userName: string,
  filter: "upcoming" | "past",
  paginationOpts: { numItems: number; cursor: string | null },
) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return { page: [], isDone: true, continueCursor: null };
  }

  const now = new Date().toISOString();

  let queryBuilder;

  if (filter === "upcoming") {
    queryBuilder = ctx.db
      .query("events")
      .withIndex("by_user_and_startDateTime", (q) => q.eq("userId", user.id))
      // Index provides ascending order by startDateTime by default as it's the second field.
      .filter((q) => q.gte(q.field("startDateTime"), now));
  } else {
    // "past"
    queryBuilder = ctx.db
      .query("events")
      .withIndex("by_user_and_startDateTime", (q) => q.eq("userId", user.id))
      .order("desc") // Reverse the natural index order to get most recent past events first
      .filter((q) => q.lt(q.field("startDateTime"), now));
  }

  const result = await queryBuilder.paginate(paginationOpts);

  const enrichedEvents = await enrichEventsAndFilterNulls(ctx, result.page);

  return {
    ...result,
    page: enrichedEvents,
  };
}
