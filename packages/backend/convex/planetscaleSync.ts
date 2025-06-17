import { v } from "convex/values";

import { and, db, eventFollows, events, gt, or, sql } from "@soonlist/db";

import { internalAction, internalMutation } from "./_generated/server";

// Get the last sync timestamp
export const getLastSyncTime = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const syncState = await ctx.db
      .query("syncState")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    return syncState?.lastSyncedAt || null;
  },
});

// Update sync state
export const updateSyncState = internalMutation({
  args: {
    key: v.string(),
    lastSyncedAt: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("syncState")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSyncedAt: args.lastSyncedAt,
        status: args.status,
        error: args.error,
      });
    } else {
      await ctx.db.insert("syncState", args);
    }
  },
});

// Sync events from PlanetScale to Convex
export const syncEvents = internalAction({
  args: {},
  handler: async (ctx) => {
    const SYNC_KEY = "events";

    try {
      // Get last sync time
      const lastSyncTime = await ctx.runMutation(getLastSyncTime, {
        key: SYNC_KEY,
      });
      const syncStartTime = new Date().toISOString();

      // Query for new or updated events
      let query = db.select().from(events);

      if (lastSyncTime) {
        query = query.where(
          or(
            gt(events.createdAt, new Date(lastSyncTime)),
            and(
              sql`${events.updatedAt} IS NOT NULL`,
              gt(sql`${events.updatedAt}`, new Date(lastSyncTime)),
            ),
          ),
        );
      }

      const changedEvents = await query.limit(100); // Process in batches

      console.log(`Found ${changedEvents.length} events to sync`);

      // Process each event
      for (const event of changedEvents) {
        try {
          // Check if user exists in Convex, if not create a basic user record
          const existingUser = await ctx.runMutation(getUserById, {
            userId: event.userId,
          });

          if (!existingUser) {
            // Create a minimal user record
            await ctx.runMutation(upsertUser, {
              id: event.userId,
              username: event.userName,
              email: `${event.userId}@placeholder.com`, // Placeholder since we don't have it
              displayName: event.userName,
              userImage: "",
              created_at: event.createdAt.toISOString(),
            });
          }

          // Extract event data for flattened fields
          const eventData = event.event as Record<string, unknown>;

          // Upsert event
          await ctx.runMutation(upsertEvent, {
            id: event.id,
            userId: event.userId,
            userName: event.userName,
            event: event.event,
            eventMetadata: event.eventMetadata || undefined,
            endDateTime: event.endDateTime.toISOString(),
            startDateTime: event.startDateTime.toISOString(),
            visibility: event.visibility,
            created_at: event.createdAt.toISOString(),
            updatedAt: event.updatedAt?.toISOString() || null,
            // Flattened fields from event object
            name: eventData?.name as string | undefined,
            image: (eventData?.images as string[] | undefined)?.[0] || null,
            endDate: eventData?.endDate as string | undefined,
            endTime: eventData?.endTime as string | undefined,
            location: eventData?.location as string | undefined,
            timeZone: eventData?.timeZone as string | undefined,
            startDate: eventData?.startDate as string | undefined,
            startTime: eventData?.startTime as string | undefined,
            description: eventData?.description as string | undefined,
          });
        } catch (error) {
          console.error(`Error syncing event ${event.id}:`, error);
          // Continue with other events
        }
      }

      // Update sync state
      await ctx.runMutation(updateSyncState, {
        key: SYNC_KEY,
        lastSyncedAt: syncStartTime,
        status: "success",
      });

      return { synced: changedEvents.length };
    } catch (error) {
      console.error("Error during event sync:", error);

      // Update sync state with error
      await ctx.runMutation(updateSyncState, {
        key: SYNC_KEY,
        lastSyncedAt: new Date().toISOString(),
        status: "failed",
        error: String(error),
      });

      throw error;
    }
  },
});

// Sync event follows from PlanetScale to Convex
export const syncEventFollows = internalAction({
  args: {},
  handler: async (ctx) => {
    const SYNC_KEY = "eventFollows";

    try {
      // Get last sync time
      const lastSyncTime = await ctx.runMutation(getLastSyncTime, {
        key: SYNC_KEY,
      });
      const syncStartTime = new Date().toISOString();

      // For event follows, we need to join with events to get timestamps
      // since EventFollows table doesn't have timestamps
      let newFollows: Array<{ userId: string; eventId: string }> = [];

      if (lastSyncTime) {
        // Join with events to filter by event creation time
        const results = await db
          .select({
            userId: eventFollows.userId,
            eventId: eventFollows.eventId,
          })
          .from(eventFollows)
          .innerJoin(events, sql`${eventFollows.eventId} = ${events.id}`)
          .where(gt(events.createdAt, new Date(lastSyncTime)))
          .limit(100);
        newFollows = results;
      } else {
        const results = await db
          .select({
            userId: eventFollows.userId,
            eventId: eventFollows.eventId,
          })
          .from(eventFollows)
          .limit(100);
        newFollows = results;
      }

      console.log(`Found ${newFollows.length} event follows to sync`);

      // Process each follow
      for (const follow of newFollows) {
        try {
          await ctx.runMutation(upsertEventFollow, {
            userId: follow.userId,
            eventId: follow.eventId,
          });
        } catch (error) {
          console.error(
            `Error syncing event follow ${follow.userId}-${follow.eventId}:`,
            error,
          );
          // Continue with other follows
        }
      }

      // Update sync state
      await ctx.runMutation(updateSyncState, {
        key: SYNC_KEY,
        lastSyncedAt: syncStartTime,
        status: "success",
      });

      return { synced: newFollows.length };
    } catch (error) {
      console.error("Error during event follows sync:", error);

      // Update sync state with error
      await ctx.runMutation(updateSyncState, {
        key: SYNC_KEY,
        lastSyncedAt: new Date().toISOString(),
        status: "failed",
        error: String(error),
      });

      throw error;
    }
  },
});

// Internal mutations for upserting data
export const upsertEvent = internalMutation({
  args: {
    id: v.string(),
    userId: v.string(),
    userName: v.string(),
    event: v.any(),
    eventMetadata: v.optional(v.any()),
    endDateTime: v.string(),
    startDateTime: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    created_at: v.string(),
    updatedAt: v.union(v.string(), v.null()),
    // Flattened fields
    name: v.optional(v.string()),
    image: v.optional(v.union(v.string(), v.null())),
    endDate: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    timeZone: v.optional(v.string()),
    startDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if event already exists
    const existing = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", args.id))
      .first();

    if (existing) {
      // Update existing event
      await ctx.db.patch(existing._id, args);
    } else {
      // Insert new event
      await ctx.db.insert("events", args);
    }
  },
});

export const upsertEventFollow = internalMutation({
  args: {
    userId: v.string(),
    eventId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if follow already exists
    const existing = await ctx.db
      .query("eventFollows")
      .withIndex("by_user_and_event", (q) =>
        q.eq("userId", args.userId).eq("eventId", args.eventId),
      )
      .first();

    if (!existing) {
      // Insert new follow
      await ctx.db.insert("eventFollows", args);
    }
  },
});

export const upsertUser = internalMutation({
  args: {
    id: v.string(),
    username: v.string(),
    email: v.string(),
    displayName: v.string(),
    userImage: v.string(),
    created_at: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", args.id))
      .first();

    if (!existing) {
      // Insert new user with minimal data
      await ctx.db.insert("users", {
        ...args,
        bio: null,
        publicEmail: null,
        publicPhone: null,
        publicInsta: null,
        publicWebsite: null,
        publicMetadata: null,
        emoji: null,
        onboardingData: null,
        onboardingCompletedAt: null,
        updatedAt: null,
      });
    }
  },
});

// Internal query to check if user exists
export const getUserById = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", userId))
      .first();
  },
});

// Combined sync function
export const syncAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const results = {
      events: { synced: 0, error: null as string | null },
      eventFollows: { synced: 0, error: null as string | null },
    };

    // Sync events
    try {
      const eventResult = await ctx.runAction(syncEvents);
      results.events.synced = eventResult.synced;
    } catch (error) {
      results.events.error = String(error);
    }

    // Sync event follows
    try {
      const followResult = await ctx.runAction(syncEventFollows);
      results.eventFollows.synced = followResult.synced;
    } catch (error) {
      results.eventFollows.error = String(error);
    }

    console.log("Sync results:", results);
    return results;
  },
});
