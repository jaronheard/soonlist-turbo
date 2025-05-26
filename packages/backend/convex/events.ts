import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { generatePublicId } from "./utils";

// Validators for complex types
const addToCalendarButtonPropsValidator = v.object({
  name: v.string(),
  startDate: v.string(),
  endDate: v.optional(v.string()),
  startTime: v.optional(v.string()),
  endTime: v.optional(v.string()),
  timeZone: v.optional(v.string()),
  location: v.optional(v.string()),
  description: v.optional(v.string()),
  images: v.optional(v.array(v.string())),
  options: v.optional(v.array(v.string())),
  iCalFileName: v.optional(v.string()),
  listStyle: v.optional(v.string()),
  buttonStyle: v.optional(v.string()),
  trigger: v.optional(v.string()),
  hideIconButton: v.optional(v.boolean()),
  hideTextLabelButton: v.optional(v.boolean()),
  hideBranding: v.optional(v.boolean()),
  size: v.optional(v.string()),
  label: v.optional(v.string()),
  inline: v.optional(v.boolean()),
  forceOverlay: v.optional(v.boolean()),
  customLabels: v.optional(v.any()),
  customCss: v.optional(v.string()),
  lightMode: v.optional(v.string()),
  language: v.optional(v.string()),
  hideCheckmark: v.optional(v.boolean()),
  hideBackground: v.optional(v.boolean()),
  hideClose: v.optional(v.boolean()),
  blockInteraction: v.optional(v.boolean()),
  styleLight: v.optional(v.string()),
  styleDark: v.optional(v.string()),
  disabled: v.optional(v.boolean()),
  hidden: v.optional(v.boolean()),
  proxy: v.optional(v.boolean()),
  fakeMobile: v.optional(v.boolean()),
  identifier: v.optional(v.string()),
  debug: v.optional(v.boolean()),
  cspnonce: v.optional(v.string()),
  bypassWebViewCheck: v.optional(v.boolean()),
  blockInteractionMobile: v.optional(v.boolean()),
  icsFile: v.optional(v.string()),
  recurrence: v.optional(v.string()),
  recurrence_interval: v.optional(v.number()),
  recurrence_until: v.optional(v.string()),
  recurrence_count: v.optional(v.number()),
  recurrence_byDay: v.optional(v.string()),
  recurrence_byMonth: v.optional(v.string()),
  recurrence_byMonthDay: v.optional(v.string()),
  recurrence_weekstart: v.optional(v.string()),
  availability: v.optional(v.string()),
  created: v.optional(v.string()),
  updated: v.optional(v.string()),
  uid: v.optional(v.string()),
  organizer: v.optional(v.string()),
  attendee: v.optional(v.string()),
  rrule: v.optional(v.string()),
  status: v.optional(v.string()),
  sequence: v.optional(v.number()),
  method: v.optional(v.string()),
  classification: v.optional(v.string()),
  subscribe: v.optional(v.boolean()),
  pastDateHandling: v.optional(v.string()),
});

const eventMetadataValidator = v.optional(v.any());

const listRecordValidator = v.record(v.string(), v.string());

const eventCreateInputValidator = v.object({
  event: addToCalendarButtonPropsValidator,
  eventMetadata: eventMetadataValidator,
  comment: v.optional(v.string()),
  lists: v.array(listRecordValidator),
  visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
});

const eventUpdateInputValidator = v.object({
  id: v.string(),
  event: addToCalendarButtonPropsValidator,
  eventMetadata: eventMetadataValidator,
  comment: v.optional(v.string()),
  lists: v.array(listRecordValidator),
  visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
});

// Return type validators
const eventReturnValidator = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  id: v.string(),
  userId: v.string(),
  userName: v.string(),
  event: v.any(),
  endDateTime: v.string(),
  startDateTime: v.string(),
  visibility: v.union(v.literal("public"), v.literal("private")),
  created_at: v.string(),
  updatedAt: v.union(v.string(), v.null()),
  name: v.optional(v.string()),
  image: v.optional(v.union(v.string(), v.null())),
  endDate: v.optional(v.string()),
  endTime: v.optional(v.string()),
  location: v.optional(v.string()),
  timeZone: v.optional(v.string()),
  startDate: v.optional(v.string()),
  startTime: v.optional(v.string()),
  description: v.optional(v.string()),
});

const eventWithRelationsValidator = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  id: v.string(),
  userId: v.string(),
  userName: v.string(),
  event: v.any(),
  endDateTime: v.string(),
  startDateTime: v.string(),
  visibility: v.union(v.literal("public"), v.literal("private")),
  created_at: v.string(),
  updatedAt: v.union(v.string(), v.null()),
  name: v.optional(v.string()),
  image: v.optional(v.union(v.string(), v.null())),
  endDate: v.optional(v.string()),
  endTime: v.optional(v.string()),
  location: v.optional(v.string()),
  timeZone: v.optional(v.string()),
  startDate: v.optional(v.string()),
  startTime: v.optional(v.string()),
  description: v.optional(v.string()),
  eventFollows: v.array(
    v.object({
      _id: v.id("eventFollows"),
      _creationTime: v.number(),
      userId: v.string(),
      eventId: v.string(),
    }),
  ),
  comments: v.array(
    v.object({
      _id: v.id("comments"),
      _creationTime: v.number(),
      content: v.string(),
      eventId: v.string(),
      userId: v.string(),
      id: v.number(),
      oldId: v.union(v.string(), v.null()),
      created_at: v.string(),
      updatedAt: v.union(v.string(), v.null()),
    }),
  ),
  user: v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    id: v.string(),
    username: v.string(),
    email: v.string(),
    displayName: v.string(),
    userImage: v.string(),
    bio: v.union(v.string(), v.null()),
    publicEmail: v.union(v.string(), v.null()),
    publicPhone: v.union(v.string(), v.null()),
    publicInsta: v.union(v.string(), v.null()),
    publicWebsite: v.union(v.string(), v.null()),
    publicMetadata: v.union(v.any(), v.null()),
    emoji: v.union(v.string(), v.null()),
    onboardingData: v.union(v.any(), v.null()),
    onboardingCompletedAt: v.union(v.string(), v.null()),
    created_at: v.string(),
    updatedAt: v.union(v.string(), v.null()),
  }),
  eventToLists: v.optional(
    v.array(
      v.object({
        _id: v.id("eventToLists"),
        _creationTime: v.number(),
        eventId: v.string(),
        listId: v.string(),
        list: v.object({
          _id: v.id("lists"),
          _creationTime: v.number(),
          id: v.string(),
          userId: v.string(),
          name: v.string(),
          description: v.string(),
          visibility: v.union(v.literal("public"), v.literal("private")),
          created_at: v.string(),
          updatedAt: v.union(v.string(), v.null()),
        }),
      }),
    ),
  ),
});

/**
 * Get an event by its ID
 */
export const get = query({
  args: { eventId: v.string() },
  returns: v.union(eventWithRelationsValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.events._internal.getEventWithRelations, {
      eventId: args.eventId,
    });
  },
});

/**
 * Get all events ordered by start date
 */
export const getAll = query({
  args: {},
  returns: v.array(eventWithRelationsValidator),
  handler: async (ctx, _args) => {
    return await ctx.runQuery(
      internal.events._internal.getAllEventsWithRelations,
      {},
    );
  },
});

/**
 * Get upcoming events with optional limit and exclude current filter
 */
export const getNext = query({
  args: {
    limit: v.optional(v.number()),
    excludeCurrent: v.optional(v.boolean()),
  },
  returns: v.array(eventWithRelationsValidator),
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.events._internal.getUpcomingEvents, {
      limit: args.limit,
      excludeCurrent: args.excludeCurrent ?? false,
    });
  },
});

/**
 * Get events for discovery (excluding user's own events)
 */
export const getDiscover = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    excludeCurrent: v.optional(v.boolean()),
  },
  returns: v.array(eventWithRelationsValidator),
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.events._internal.getDiscoverEvents, {
      userId: args.userId,
      limit: args.limit,
      excludeCurrent: args.excludeCurrent ?? false,
    });
  },
});

/**
 * Get events for discovery with infinite pagination
 */
export const getDiscoverInfinite = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  returns: v.object({
    events: v.array(eventWithRelationsValidator),
    nextCursor: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const cursor = args.cursor ?? 0;

    if (limit < 1 || limit > 100) {
      throw new ConvexError("Limit must be between 1 and 100");
    }

    return await ctx.runQuery(
      internal.events._internal.getDiscoverEventsInfinite,
      {
        userId: args.userId,
        limit,
        cursor,
      },
    );
  },
});

/**
 * Get events for a specific user with pagination
 */
export const getEventsForUser = query({
  args: {
    userName: v.string(),
    filter: v.union(v.literal("upcoming"), v.literal("past")),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  returns: v.object({
    events: v.array(eventWithRelationsValidator),
    nextCursor: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const cursor = args.cursor ?? 0;

    if (limit < 1 || limit > 100) {
      throw new ConvexError("Limit must be between 1 and 100");
    }

    return await ctx.runQuery(
      internal.events._internal.getEventsForUserPaginated,
      {
        userName: args.userName,
        filter: args.filter,
        limit,
        cursor,
      },
    );
  },
});

/**
 * Get possible duplicate events based on start time
 */
export const getPossibleDuplicates = query({
  args: { startDateTime: v.string() },
  returns: v.array(eventWithRelationsValidator),
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      internal.events._internal.findPossibleDuplicates,
      {
        startDateTime: args.startDateTime,
      },
    );
  },
});

/**
 * Get user statistics
 */
export const getStats = query({
  args: { userName: v.string() },
  returns: v.object({
    capturesThisWeek: v.number(),
    weeklyGoal: v.number(),
    upcomingEvents: v.number(),
    allTimeEvents: v.number(),
  }),
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.events._internal.getUserStats, {
      userName: args.userName,
    });
  },
});

/**
 * Create a new event
 */
export const create = mutation({
  args: {
    userId: v.string(),
    username: v.string(),
    ...eventCreateInputValidator.fields,
  },
  returns: v.object({ id: v.string() }),
  handler: async (ctx, args) => {
    const eventId = generatePublicId();

    await ctx.runMutation(internal.events._internal.createEventWithRelations, {
      eventId,
      userId: args.userId,
      username: args.username,
      event: args.event,
      eventMetadata: args.eventMetadata,
      comment: args.comment,
      lists: args.lists,
      visibility: args.visibility,
    });

    return { id: eventId };
  },
});

/**
 * Update an existing event
 */
export const update = mutation({
  args: {
    userId: v.string(),
    isAdmin: v.optional(v.boolean()),
    ...eventUpdateInputValidator.fields,
  },
  returns: v.object({ id: v.string() }),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.events._internal.updateEventWithRelations, {
      eventId: args.id,
      userId: args.userId,
      isAdmin: args.isAdmin ?? false,
      event: args.event,
      eventMetadata: args.eventMetadata,
      comment: args.comment,
      lists: args.lists,
      visibility: args.visibility,
    });

    return { id: args.id };
  },
});

/**
 * Delete an event
 */
export const deleteEvent = mutation({
  args: {
    id: v.string(),
    userId: v.string(),
    isAdmin: v.optional(v.boolean()),
  },
  returns: v.object({ id: v.string() }),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.events._internal.deleteEventWithRelations, {
      eventId: args.id,
      userId: args.userId,
      isAdmin: args.isAdmin ?? false,
    });

    return { id: args.id };
  },
});

/**
 * Follow an event
 */
export const follow = mutation({
  args: {
    id: v.string(),
    userId: v.string(),
  },
  returns: v.union(eventWithRelationsValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.runMutation(internal.events._internal.followEvent, {
      eventId: args.id,
      userId: args.userId,
    });
  },
});

/**
 * Unfollow an event
 */
export const unfollow = mutation({
  args: {
    id: v.string(),
    userId: v.string(),
  },
  returns: v.union(eventWithRelationsValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.runMutation(internal.events._internal.unfollowEvent, {
      eventId: args.id,
      userId: args.userId,
    });
  },
});

/**
 * Add event to list
 */
export const addToList = mutation({
  args: {
    eventId: v.string(),
    listId: v.string(),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.events._internal.addEventToList, {
      eventId: args.eventId,
      listId: args.listId,
      userId: args.userId,
    });
    return null;
  },
});

/**
 * Remove event from list
 */
export const removeFromList = mutation({
  args: {
    eventId: v.string(),
    listId: v.string(),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.events._internal.removeEventFromList, {
      eventId: args.eventId,
      listId: args.listId,
      userId: args.userId,
    });
    return null;
  },
});

/**
 * Toggle event visibility
 */
export const toggleVisibility = mutation({
  args: {
    id: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.events._internal.toggleEventVisibility, {
      eventId: args.id,
      visibility: args.visibility,
      userId: args.userId,
    });
    return null;
  },
});
