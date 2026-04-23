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
import { getViewableListIds } from "./model/lists";

const eventMetadataValidator = v.optional(
  v.object({
    accessibility: v.optional(v.array(v.string())),
    accessibilityNotes: v.optional(v.string()),
    ageRestriction: v.optional(v.string()),
    category: v.optional(v.string()),
    mentions: v.optional(v.array(v.string())),
    performers: v.optional(v.array(v.string())),
    platform: v.optional(v.string()),
    priceMax: v.optional(v.number()),
    priceMin: v.optional(v.number()),
    priceType: v.optional(v.string()),
    source: v.optional(v.string()),
    sourceUrls: v.optional(v.array(v.string())),
    type: v.optional(v.string()),
  }),
);

export const eventDataValidator = v.object({
  name: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  startTime: v.optional(v.string()),
  endTime: v.optional(v.string()),
  timeZone: v.optional(v.string()),
  location: v.optional(v.string()),
  description: v.optional(v.string()),
  images: v.optional(v.array(v.string())),
  eventMetadata: eventMetadataValidator,
});

const listValidator = v.object({
  value: v.string(),
});

export const getEventsByBatchId = query({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Authentication required");
    }

    const batch = await ctx.db
      .query("eventBatches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .unique();
    if (batch?.userId !== identity.subject) {
      throw new ConvexError("Batch not found or access denied");
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .order("desc")
      .collect();

    return await enrichEventsAndFilterNulls(ctx, events);
  },
});

export const getSavedIdsForUser = query({
  args: { userName: v.string() },
  handler: async (ctx, args) => {
    return await Events.getSavedEventIdsForUser(ctx, args.userName);
  },
});

export const get = query({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    const event = await Events.getEventById(ctx, args.eventId);
    if (!event) return null;

    const identity = await ctx.auth.getUserIdentity();
    const viewerId = identity?.subject ?? null;
    const viewableListIds = await getViewableListIds(
      ctx,
      event.lists,
      viewerId,
    );
    const lists = event.lists.filter((l) => viewableListIds.has(l.id));
    return { ...event, lists };
  },
});

export const getDiscoverPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    beforeThisDateTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { beforeThisDateTime } = args;

    const result = await ctx.db
      .query("events")
      .filter((q) => {
        let baseFilter = q.eq(q.field("visibility"), "public");

        if (identity) {
          baseFilter = q.and(
            baseFilter,
            q.neq(q.field("userId"), identity.subject),
          );
        }

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

    const enrichedEvents = await enrichEventsAndFilterNulls(ctx, result.page);

    return {
      ...result,
      page: enrichedEvents,
    };
  },
});

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

    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    const followedEventIds = new Set(eventFollows.map((ef) => ef.eventId));

    const eventsQuery = ctx.db.query("events").filter((q) => {
      const userFilter = q.eq(q.field("userId"), user.id);

      if (followedEventIds.size === 0) {
        if (beforeThisDateTime) {
          const dateFilter =
            filter === "upcoming"
              ? q.gte(q.field("endDateTime"), beforeThisDateTime)
              : q.lt(q.field("endDateTime"), beforeThisDateTime);
          return q.and(dateFilter, userFilter);
        }
        return userFilter;
      }

      const followedEventFilters = Array.from(followedEventIds).map((eventId) =>
        q.eq(q.field("id"), eventId),
      );

      const eventFilter = q.or(userFilter, ...followedEventFilters);

      if (beforeThisDateTime) {
        const dateFilter =
          filter === "upcoming"
            ? q.gte(q.field("endDateTime"), beforeThisDateTime)
            : q.lt(q.field("endDateTime"), beforeThisDateTime);
        return q.and(dateFilter, eventFilter);
      }

      return eventFilter;
    });

    const orderedQuery =
      filter === "upcoming"
        ? eventsQuery.order("asc")
        : eventsQuery.order("desc");

    const result = await orderedQuery.paginate(args.paginationOpts);

    const enrichedEvents = await enrichEventsAndFilterNulls(ctx, result.page);

    return {
      ...result,
      page: enrichedEvents,
    };
  },
});

export const getStats = query({
  args: { userName: v.string() },
  handler: async (ctx, args) => {
    return await Events.getUserStats(ctx, args.userName);
  },
});

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

    const isAdmin = isUserAdmin(identity);

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

    const isAdmin = isUserAdmin(identity);

    return await Events.deleteEvent(ctx, identity.subject, args.id, isAdmin);
  },
});

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



function extractRolesFromObject(obj: unknown): string[] {
  if (!obj || typeof obj !== "object") {
    return [];
  }

  const typedObj = obj as Record<string, unknown>;
  const roles = typedObj.roles;

  if (Array.isArray(roles) && roles.every((role) => typeof role === "string")) {
    return roles;
  }

  return [];
}

function isUserAdmin(identity: Record<string, unknown> | null): boolean {
  try {
    if (!identity) {
      return false;
    }

    const possibleLocations = [
      identity.unsafe_metadata, // Unsafe metadata (less common)
    ];

    for (const location of possibleLocations) {
      const roles = extractRolesFromObject(location);
      if (roles.includes("admin")) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}


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
    batchId: v.optional(v.string()),
  },
  returns: v.string(), // eventId
  handler: async (ctx, args): Promise<string> => {
    const {
      firstEvent,
      uploadedImageUrl,
      comment,
      lists,
      visibility,
      batchId,
    } = args;

    const { eventMetadata, ...eventDataWithoutMetadata } = firstEvent;

    const eventData = {
      ...eventDataWithoutMetadata,
      ...(uploadedImageUrl && {
        images: [
          uploadedImageUrl,
          uploadedImageUrl,
          uploadedImageUrl,
          uploadedImageUrl,
        ],
      }),
    };

    const result = await Events.createEvent(
      ctx,
      args.userId,
      args.username,
      eventData,
      eventMetadata,
      comment,
      lists,
      visibility,
      batchId,
    );

    return result.id;
  },
});

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
