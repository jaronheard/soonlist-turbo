import { ConvexError, v } from "convex/values";

import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { generatePublicId } from "./utils";

// Helper function to get user by username
async function getUserByUsername(
  ctx: QueryCtx | MutationCtx,
  username: string,
) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", username))
    .unique();
  return user;
}

// Helper function to get user by ID
async function getUserById(ctx: QueryCtx | MutationCtx, userId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_custom_id", (q) => q.eq("id", userId))
    .unique();
  return user;
}

// Helper function to get list with related data
async function getListWithRelations(
  ctx: QueryCtx | MutationCtx,
  listId: string,
) {
  const list = await ctx.db
    .query("lists")
    .withIndex("by_custom_id", (q) => q.eq("id", listId))
    .unique();

  if (!list) return null;

  // Get user
  const user = await getUserById(ctx, list.userId);

  // Get event to lists
  const eventToLists = await ctx.db
    .query("eventToLists")
    .withIndex("by_list", (q) => q.eq("listId", listId))
    .collect();

  // Get events for each eventToList
  const eventsWithData = await Promise.all(
    eventToLists.map(async (etl) => {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", etl.eventId))
        .unique();

      if (!event) return null;

      // Get event user
      const eventUser = await getUserById(ctx, event.userId);

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

      return {
        ...event,
        user: eventUser,
        eventFollows,
        comments,
      };
    }),
  );

  // Get list follows
  const listFollows = await ctx.db
    .query("listFollows")
    .withIndex("by_list", (q) => q.eq("listId", listId))
    .collect();

  return {
    ...list,
    user,
    eventToLists: eventsWithData.filter(Boolean).map((event, index) => ({
      ...eventToLists[index],
      event,
    })),
    listFollows,
  };
}

/**
 * Get all lists for a user by username
 */
export const getAllForUser = query({
  args: { userName: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await getUserByUsername(ctx, args.userName);
    if (!user) return [];

    const lists = await ctx.db
      .query("lists")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    // Sort by updatedAt (ascending)
    const sortedLists = lists.sort((a, b) => {
      const aTime = a.updatedAt || a.created_at;
      const bTime = b.updatedAt || b.created_at;
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });

    // Get related data for each list
    const listsWithData = await Promise.all(
      sortedLists.map(async (list) => {
        // Get event to lists
        const eventToLists = await ctx.db
          .query("eventToLists")
          .withIndex("by_list", (q) => q.eq("listId", list.id))
          .collect();

        return {
          ...list,
          user: {
            id: user.id,
            username: user.username,
          },
          eventToLists,
        };
      }),
    );

    return listsWithData;
  },
});

/**
 * Get all lists for a user by user ID
 */
export const getAllForUserId = query({
  args: { userId: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await getUserById(ctx, args.userId);
    if (!user) return [];

    const lists = await ctx.db
      .query("lists")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Sort by updatedAt (ascending)
    const sortedLists = lists.sort((a, b) => {
      const aTime = a.updatedAt || a.created_at;
      const bTime = b.updatedAt || b.created_at;
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });

    // Get related data for each list
    const listsWithData = await Promise.all(
      sortedLists.map(async (list) => {
        // Get event to lists
        const eventToLists = await ctx.db
          .query("eventToLists")
          .withIndex("by_list", (q) => q.eq("listId", list.id))
          .collect();

        return {
          ...list,
          user: {
            id: user.id,
            username: user.username,
          },
          eventToLists,
        };
      }),
    );

    return listsWithData;
  },
});

/**
 * Get lists that a user is following
 */
export const getFollowing = query({
  args: { userName: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await getUserByUsername(ctx, args.userName);
    if (!user) return [];

    // Get all list follows for this user
    const listFollows = await ctx.db
      .query("listFollows")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    if (listFollows.length === 0) return [];

    // Get the lists and their related data
    const listsWithData = await Promise.all(
      listFollows.map(async (follow) => {
        const list = await ctx.db
          .query("lists")
          .withIndex("by_custom_id", (q) => q.eq("id", follow.listId))
          .unique();

        if (!list) return null;

        // Get list owner
        const listOwner = await getUserById(ctx, list.userId);

        // Get event to lists
        const eventToLists = await ctx.db
          .query("eventToLists")
          .withIndex("by_list", (q) => q.eq("listId", list.id))
          .collect();

        return {
          ...list,
          user: {
            id: listOwner?.id || "",
            username: listOwner?.username || "",
          },
          eventToLists,
        };
      }),
    );

    return listsWithData.filter((list) => list !== null);
  },
});

/**
 * Get a single list by ID with all related data
 */
export const get = query({
  args: { listId: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await getListWithRelations(ctx, args.listId);
  },
});

/**
 * Follow a list
 */
export const follow = mutation({
  args: {
    listId: v.string(),
    userId: v.string(),
  },
  returns: v.object({
    _id: v.id("listFollows"),
    _creationTime: v.number(),
    userId: v.string(),
    listId: v.string(),
  }),
  handler: async (ctx, args) => {
    // Check if already following
    const existingFollow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", args.userId).eq("listId", args.listId),
      )
      .unique();

    if (existingFollow) {
      throw new ConvexError("Already following this list");
    }

    const followId = await ctx.db.insert("listFollows", {
      userId: args.userId,
      listId: args.listId,
    });

    const follow = await ctx.db.get(followId);
    if (!follow) {
      throw new ConvexError("Failed to create follow");
    }

    return follow;
  },
});

/**
 * Unfollow a list
 */
export const unfollow = mutation({
  args: {
    listId: v.string(),
    userId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existingFollow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", args.userId).eq("listId", args.listId),
      )
      .unique();

    if (!existingFollow) {
      throw new ConvexError("Not following this list");
    }

    await ctx.db.delete(existingFollow._id);

    return { success: true };
  },
});

/**
 * Create a new list
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    userId: v.string(),
  },
  returns: v.object({
    id: v.string(),
  }),
  handler: async (ctx, args) => {
    const id = generatePublicId();
    const now = new Date().toISOString();

    await ctx.db.insert("lists", {
      id,
      userId: args.userId,
      name: args.name,
      description: args.description,
      visibility: args.visibility,
      created_at: now,
      updatedAt: null,
    });

    return { id };
  },
});

/**
 * Update an existing list
 */
export const update = mutation({
  args: {
    listId: v.string(),
    name: v.string(),
    description: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    userId: v.string(),
  },
  returns: v.object({
    id: v.string(),
  }),
  handler: async (ctx, args) => {
    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", args.listId))
      .unique();

    if (!list) {
      throw new ConvexError("List not found");
    }

    // Check if user owns the list
    if (list.userId !== args.userId) {
      throw new ConvexError("Not authorized to update this list");
    }

    const now = new Date().toISOString();

    await ctx.db.patch(list._id, {
      name: args.name,
      description: args.description,
      visibility: args.visibility,
      updatedAt: now,
    });

    return { id: args.listId };
  },
});

/**
 * Delete a list and all its event associations
 */
export const deleteList = mutation({
  args: {
    listId: v.string(),
    userId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", args.listId))
      .unique();

    if (!list) {
      throw new ConvexError("List not found");
    }

    // Check if user owns the list
    if (list.userId !== args.userId) {
      throw new ConvexError("Not authorized to delete this list");
    }

    // Delete all event to list associations
    const eventToLists = await ctx.db
      .query("eventToLists")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    for (const etl of eventToLists) {
      await ctx.db.delete(etl._id);
    }

    // Delete all list follows
    const listFollows = await ctx.db
      .query("listFollows")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    for (const follow of listFollows) {
      await ctx.db.delete(follow._id);
    }

    // Delete the list itself
    await ctx.db.delete(list._id);

    return { success: true };
  },
});

/**
 * Add an event to a list
 */
export const addEventToList = mutation({
  args: {
    eventId: v.string(),
    listId: v.string(),
    userId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Check if user owns the list
    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", args.listId))
      .unique();

    if (!list) {
      throw new ConvexError("List not found");
    }

    if (list.userId !== args.userId) {
      throw new ConvexError("Not authorized to modify this list");
    }

    // Check if event is already in the list
    const existingRelation = await ctx.db
      .query("eventToLists")
      .withIndex("by_event_and_list", (q) =>
        q.eq("eventId", args.eventId).eq("listId", args.listId),
      )
      .unique();

    if (existingRelation) {
      throw new ConvexError("Event is already in this list");
    }

    await ctx.db.insert("eventToLists", {
      eventId: args.eventId,
      listId: args.listId,
    });

    return { success: true };
  },
});

/**
 * Remove an event from a list
 */
export const removeEventFromList = mutation({
  args: {
    eventId: v.string(),
    listId: v.string(),
    userId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Check if user owns the list
    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", args.listId))
      .unique();

    if (!list) {
      throw new ConvexError("List not found");
    }

    if (list.userId !== args.userId) {
      throw new ConvexError("Not authorized to modify this list");
    }

    // Find and remove the relation
    const relation = await ctx.db
      .query("eventToLists")
      .withIndex("by_event_and_list", (q) =>
        q.eq("eventId", args.eventId).eq("listId", args.listId),
      )
      .unique();

    if (!relation) {
      throw new ConvexError("Event is not in this list");
    }

    await ctx.db.delete(relation._id);

    return { success: true };
  },
});

/**
 * Get all events in a specific list
 */
export const getEventsInList = query({
  args: { listId: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all event to list relations for this list
    const eventToLists = await ctx.db
      .query("eventToLists")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    // Get all events
    const events = await Promise.all(
      eventToLists.map(async (etl) => {
        const event = await ctx.db
          .query("events")
          .withIndex("by_custom_id", (q) => q.eq("id", etl.eventId))
          .unique();

        if (!event) return null;

        // Get event user
        const eventUser = await getUserById(ctx, event.userId);

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

        return {
          ...event,
          user: eventUser,
          eventFollows,
          comments,
        };
      }),
    );

    return events.filter((event) => event !== null);
  },
});
