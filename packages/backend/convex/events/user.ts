import { v } from "convex/values";

import { internal } from "../_generated/api";
import { query } from "../_generated/server";

// Return type validator for events with relations
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
 * Get all events for a user
 */
export const getForUser = query({
  args: { userName: v.string() },
  returns: v.array(eventWithRelationsValidator),
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.events.user.getEventsForUser, {
      userName: args.userName,
    });
  },
});

/**
 * Get upcoming events for a user (created and saved)
 */
export const getUpcomingForUser = query({
  args: { userName: v.string() },
  returns: v.array(eventWithRelationsValidator),
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.events.user.getUpcomingEventsForUser, {
      userName: args.userName,
    });
  },
});

/**
 * Get events created by a user
 */
export const getCreatedForUser = query({
  args: { userName: v.string() },
  returns: v.array(eventWithRelationsValidator),
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.events.user.getCreatedEventsForUser, {
      userName: args.userName,
    });
  },
});

/**
 * Get events that a user is following
 */
export const getFollowingForUser = query({
  args: { userName: v.string() },
  returns: v.array(eventWithRelationsValidator),
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.events.user.getFollowingEventsForUser, {
      userName: args.userName,
    });
  },
});

/**
 * Get upcoming events that a user is following
 */
export const getFollowingUpcomingForUser = query({
  args: { userName: v.string() },
  returns: v.array(eventWithRelationsValidator),
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      internal.events.user.getFollowingUpcomingEventsForUser,
      {
        userName: args.userName,
      },
    );
  },
});

/**
 * Get saved events for a user
 */
export const getSavedForUser = query({
  args: { userName: v.string() },
  returns: v.array(eventWithRelationsValidator),
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.events.user.getSavedEventsForUser, {
      userName: args.userName,
    });
  },
});

/**
 * Get saved event IDs for a user
 */
export const getSavedIdsForUser = query({
  args: { userName: v.string() },
  returns: v.array(v.object({ id: v.string() })),
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.events.user.getSavedEventIdsForUser, {
      userName: args.userName,
    });
  },
});
