import { v } from "convex/values";

import {
  and,
  db,
  eventFollows,
  events,
  gt,
  or,
  sql,
  users,
} from "@soonlist/db";

import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import {
  findSimilarityGroup,
  generateSimilarityGroupId,
} from "./model/similarityHelpers";

// Type for sync state
type SyncState = {
  _id: Id<"syncState">;
  _creationTime: number;
  key: string;
  lastSyncedAt: string;
  status: "success" | "failed";
  error?: string;
  offset?: number;
  metadata?: {
    hasMore?: boolean;
    lastBatchSize?: number;
    syncedCount?: number;
    lastProcessedUserId?: string;
    lastProcessedEventId?: string;
  };
} | null;

// Get the last sync state
export const getLastSyncState = internalQuery({
  args: { key: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("syncState"),
      _creationTime: v.number(),
      key: v.string(),
      lastSyncedAt: v.string(),
      status: v.union(v.literal("success"), v.literal("failed")),
      error: v.optional(v.string()),
      offset: v.optional(v.number()),
      metadata: v.optional(
        v.object({
          hasMore: v.optional(v.boolean()),
          lastBatchSize: v.optional(v.number()),
          syncedCount: v.optional(v.number()),
          lastProcessedUserId: v.optional(v.string()),
          lastProcessedEventId: v.optional(v.string()),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, { key }) => {
    const syncState = await ctx.db
      .query("syncState")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    return syncState;
  },
});

// Update sync state
export const updateSyncState = internalMutation({
  args: {
    key: v.string(),
    lastSyncedAt: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    error: v.optional(v.string()),
    offset: v.optional(v.number()),
    metadata: v.optional(
      v.object({
        hasMore: v.optional(v.boolean()),
        lastBatchSize: v.optional(v.number()),
        syncedCount: v.optional(v.number()),
        lastProcessedUserId: v.optional(v.string()),
        lastProcessedEventId: v.optional(v.string()),
      }),
    ),
  },
  returns: v.null(),
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
        offset: args.offset,
        metadata: args.metadata,
      });
    } else {
      await ctx.db.insert("syncState", args);
    }
    return null;
  },
});

// Sync events from PlanetScale to Convex
export const syncEvents = internalAction({
  args: {},
  returns: v.object({
    synced: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx) => {
    const SYNC_KEY = "events";
    let lastSyncTime: string | null = null;

    try {
      // Get last sync state
      const syncState: SyncState = await ctx.runQuery(
        internal.planetscaleSync.getLastSyncState,
        {
          key: SYNC_KEY,
        },
      );
      lastSyncTime = syncState?.lastSyncedAt || null;
      const syncStartTime = new Date().toISOString();

      const allProcessedEvents: {
        successCount: number;
        failedCount: number;
        maxProcessedTimestamp: string;
      }[] = [];
      let hasMore = true;
      let offset = 0;
      const batchSize = 100;

      while (hasMore) {
        // Query for new or updated events with stable ordering
        const baseQuery = db.select().from(events);

        const changedEvents = await (
          lastSyncTime
            ? baseQuery.where(
                or(
                  gt(events.createdAt, new Date(lastSyncTime)),
                  and(
                    sql`${events.updatedAt} IS NOT NULL`,
                    gt(sql`${events.updatedAt}`, new Date(lastSyncTime)),
                  ),
                ),
              )
            : baseQuery
        )
          .orderBy(events.createdAt, events.id) // Stable order by createdAt, then id
          .limit(batchSize)
          .offset(offset);

        console.log(
          `Processing batch: ${changedEvents.length} events (offset: ${offset})`,
        );

        if (changedEvents.length === 0) {
          hasMore = false;
          break;
        }

        let successCount = 0;
        let failedCount = 0;
        let maxProcessedTimestamp = lastSyncTime || "1970-01-01T00:00:00.000Z";

        // Process each event
        for (const event of changedEvents) {
          try {
            // Check if user exists in Convex, if not create a basic user record
            const existingUser = await ctx.runQuery(
              internal.planetscaleSync.getUserById,
              {
                userId: event.userId,
              },
            );

            if (!existingUser) {
              // Fetch the actual user from PlanetScale
              const planetScaleUsers = await db
                .select()
                .from(users)
                .where(sql`${users.id} = ${event.userId}`)
                .limit(1);
              const planetScaleUser = planetScaleUsers[0];

              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              if (!planetScaleUser) {
                // Skip this event if user doesn't exist in PlanetScale
                console.warn(
                  `User ${event.userId} not found in PlanetScale, skipping event ${event.id}`,
                );
                continue;
              }

              // Create user with actual data from PlanetScale
              await ctx.runMutation(internal.planetscaleSync.upsertUser, {
                id: planetScaleUser.id,
                username: planetScaleUser.username,
                email: planetScaleUser.email,
                displayName: planetScaleUser.displayName,
                userImage: planetScaleUser.userImage,
                created_at: planetScaleUser.createdAt.toISOString(),
              });
            }

            // Extract event data for flattened fields
            const isObject = (
              value: unknown,
            ): value is Record<string, unknown> => {
              return (
                typeof value === "object" &&
                value !== null &&
                !Array.isArray(value)
              );
            };

            const eventData: Record<string, unknown> = isObject(event.event)
              ? event.event
              : {};

            // Helper function to safely get string value
            const getStringField = (key: string): string | undefined => {
              const value = eventData[key];
              return typeof value === "string" ? value : undefined;
            };

            // Helper function to safely get first image
            const getFirstImage = (): string | null => {
              const images = eventData.images;
              if (
                Array.isArray(images) &&
                images.length > 0 &&
                typeof images[0] === "string"
              ) {
                return images[0];
              }
              return null;
            };

            // Upsert event
            await ctx.runMutation(internal.planetscaleSync.upsertEvent, {
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
              name: getStringField("name"),
              image: getFirstImage(),
              endDate: getStringField("endDate"),
              endTime: getStringField("endTime"),
              location: getStringField("location"),
              timeZone: getStringField("timeZone"),
              startDate: getStringField("startDate"),
              startTime: getStringField("startTime"),
              description: getStringField("description"),
            });
            successCount++;

            // Track the maximum timestamp from processed events
            const eventTimestamp = event.updatedAt || event.createdAt;
            if (eventTimestamp.toISOString() > maxProcessedTimestamp) {
              maxProcessedTimestamp = eventTimestamp.toISOString();
            }
          } catch (error) {
            console.error(`Error syncing event ${event.id}:`, error);
            failedCount++;
            // Continue with other events
          }
        }

        // Add results to overall tracking
        allProcessedEvents.push({
          successCount,
          failedCount,
          maxProcessedTimestamp,
        });

        // Check if we should continue
        if (changedEvents.length < batchSize) {
          hasMore = false;
        } else {
          offset += batchSize;
        }
      }

      // Calculate totals from all batches
      let totalSuccess = 0;
      let totalFailed = 0;
      let overallMaxTimestamp = lastSyncTime || "1970-01-01T00:00:00.000Z";

      for (const batch of allProcessedEvents) {
        totalSuccess += batch.successCount;
        totalFailed += batch.failedCount;
        if (batch.maxProcessedTimestamp > overallMaxTimestamp) {
          overallMaxTimestamp = batch.maxProcessedTimestamp;
        }
      }

      // Update sync state
      const syncStatus =
        totalFailed > 0 && totalSuccess === 0 ? "failed" : "success";
      // Only update lastSyncedAt if we successfully processed some events
      const newSyncTime =
        totalSuccess > 0 ? overallMaxTimestamp : lastSyncTime || syncStartTime;

      await ctx.runMutation(internal.planetscaleSync.updateSyncState, {
        key: SYNC_KEY,
        lastSyncedAt: newSyncTime,
        status: syncStatus,
        error:
          totalFailed > 0 ? `Failed to sync ${totalFailed} events` : undefined,
      });

      console.log(
        `Sync completed: ${totalSuccess} succeeded, ${totalFailed} failed`,
      );
      return { synced: totalSuccess, failed: totalFailed };
    } catch (error) {
      console.error("Error during event sync:", error);

      // Update sync state with error
      await ctx.runMutation(internal.planetscaleSync.updateSyncState, {
        key: SYNC_KEY,
        lastSyncedAt: lastSyncTime || new Date().toISOString(),
        status: "failed",
        error: String(error),
      });

      throw error;
    }
  },
});

// Sync event follows from PlanetScale to Convex - IMPROVED VERSION
export const syncEventFollows = internalAction({
  args: {},
  returns: v.object({
    synced: v.number(),
    processed: v.number(),
    hasMore: v.boolean(),
    nextOffset: v.union(v.number(), v.null()),
  }),
  handler: async (ctx) => {
    const SYNC_KEY = "eventFollows";
    let syncState: SyncState = null;

    try {
      const syncStartTime = new Date().toISOString();

      // Get the last processed composite key from sync state
      syncState = await ctx.runQuery(
        internal.planetscaleSync.getLastSyncState,
        {
          key: SYNC_KEY,
        },
      );

      // Use metadata to track the last processed composite key instead of offset
      const metadata = syncState?.metadata;
      const lastProcessedUserId: string = metadata?.lastProcessedUserId ?? "";
      const lastProcessedEventId: string = metadata?.lastProcessedEventId ?? "";

      const batchSize = 1000;

      // Fetch a batch of event follows using composite key cursor pagination
      // This is more reliable than offset-based pagination
      const baseQuery = db
        .select({
          userId: eventFollows.userId,
          eventId: eventFollows.eventId,
        })
        .from(eventFollows);

      const newFollows: { userId: string; eventId: string }[] = await (
        lastProcessedUserId && lastProcessedEventId
          ? baseQuery.where(
              or(
                gt(eventFollows.userId, lastProcessedUserId),
                and(
                  sql`${eventFollows.userId} = ${lastProcessedUserId}`,
                  gt(eventFollows.eventId, lastProcessedEventId),
                ),
              ),
            )
          : baseQuery
      )
        .orderBy(eventFollows.userId, eventFollows.eventId) // Stable ordering by composite key
        .limit(batchSize);

      console.log(
        `Found ${newFollows.length} event follows to sync (after userId: ${lastProcessedUserId}, eventId: ${lastProcessedEventId})`,
      );

      let syncedCount = 0;
      let lastUserId: string = lastProcessedUserId;
      let lastEventId: string = lastProcessedEventId;

      // Process each follow
      for (const follow of newFollows) {
        try {
          // Check if both user and event exist in Convex before creating follow
          const [userExists, eventExists] = await Promise.all([
            ctx.runQuery(internal.planetscaleSync.getUserById, {
              userId: follow.userId,
            }),
            ctx.runQuery(internal.planetscaleSync.getEventById, {
              eventId: follow.eventId,
            }),
          ]);

          if (userExists && eventExists) {
            await ctx.runMutation(internal.planetscaleSync.upsertEventFollow, {
              userId: follow.userId,
              eventId: follow.eventId,
            });
            syncedCount++;
          } else {
            // Skip if user or event doesn't exist yet
            if (!userExists) {
              console.log(
                `Skipping follow - user ${follow.userId} not found in Convex`,
              );
            }
            if (!eventExists) {
              console.log(
                `Skipping follow - event ${follow.eventId} not found in Convex`,
              );
            }
          }

          // Track the last processed keys
          lastUserId = follow.userId;
          lastEventId = follow.eventId;
        } catch (error) {
          console.error(
            `Error syncing event follow ${follow.userId}-${follow.eventId}:`,
            error,
          );
          // Continue with other follows
        }
      }

      // Determine if there are more records
      const hasMore = newFollows.length === batchSize;

      // Update sync state with cursor information instead of offset
      await ctx.runMutation(internal.planetscaleSync.updateSyncState, {
        key: SYNC_KEY,
        lastSyncedAt:
          syncedCount > 0
            ? syncStartTime
            : syncState?.lastSyncedAt || syncStartTime,
        status: "success",
        metadata: {
          hasMore,
          lastBatchSize: newFollows.length,
          syncedCount,
          lastProcessedUserId: lastUserId,
          lastProcessedEventId: lastEventId,
        },
      });

      return {
        synced: syncedCount,
        processed: newFollows.length,
        hasMore,
        nextOffset: null, // We no longer use offset, so return null
      };
    } catch (error) {
      console.error("Error during event follows sync:", error);

      // Update sync state with error
      await ctx.runMutation(internal.planetscaleSync.updateSyncState, {
        key: SYNC_KEY,
        lastSyncedAt: syncState?.lastSyncedAt || new Date().toISOString(),
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
    similarityGroupId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const similarityGroupId =
      args.similarityGroupId ??
      (await findSimilarityGroup(ctx, {
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
        name: args.name,
        description: args.description,
        location: args.location,
      })) ??
      generateSimilarityGroupId();

    // Check if event already exists
    const existing = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", args.id))
      .first();

    if (existing) {
      // Update existing event
      await ctx.db.patch(existing._id, {
        ...args,
        similarityGroupId:
          existing.similarityGroupId ?? args.similarityGroupId ?? similarityGroupId,
      });

      // Update feeds if visibility or time changed
      const visibilityChanged = existing.visibility !== args.visibility;
      const timeChanged = existing.startDateTime !== args.startDateTime;

      if (visibilityChanged || timeChanged) {
        // If changing to private, remove from discover feed
        if (args.visibility === "private" && existing.visibility === "public") {
          await ctx.runMutation(internal.feedHelpers.removeEventFromFeeds, {
            eventId: args.id,
            keepCreatorFeed: true,
          });
        }

        // Update event in feeds with new visibility and/or time
        await ctx.runMutation(internal.feedHelpers.updateEventInFeeds, {
          eventId: args.id,
          userId: args.userId,
          visibility: args.visibility,
          startDateTime: args.startDateTime,
          endDateTime: args.endDateTime,
          similarityGroupId:
            existing.similarityGroupId ??
            args.similarityGroupId ??
            similarityGroupId,
        });
      }
    } else {
      // Insert new event
      await ctx.db.insert("events", {
        ...args,
        similarityGroupId,
      });

      // Add event to feeds
      await ctx.runMutation(internal.feedHelpers.updateEventInFeeds, {
        eventId: args.id,
        userId: args.userId,
        visibility: args.visibility,
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
        similarityGroupId,
      });
    }
    return null;
  },
});

export const upsertEventFollow = internalMutation({
  args: {
    userId: v.string(),
    eventId: v.string(),
  },
  returns: v.null(),
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

      // Add event to user's feed
      await ctx.runMutation(internal.feedHelpers.addEventToUserFeed, {
        userId: args.userId,
        eventId: args.eventId,
      });
    }
    return null;
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
  returns: v.null(),
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
    return null;
  },
});

// Internal query to check if user exists
export const getUserById = internalQuery({
  args: { userId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      id: v.string(),
      created_at: v.string(),
      updatedAt: v.union(v.string(), v.null()),
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
    }),
    v.null(),
  ),
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", userId))
      .first();
  },
});

// Internal query to check if event exists
export const getEventById = internalQuery({
  args: { eventId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("events"),
      _creationTime: v.number(),
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
    }),
    v.null(),
  ),
  handler: async (ctx, { eventId }) => {
    return await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", eventId))
      .first();
  },
});

// Combined sync function
export const syncAll = internalAction({
  args: {},
  returns: v.object({
    events: v.object({
      synced: v.number(),
      error: v.union(v.string(), v.null()),
    }),
    eventFollows: v.object({
      synced: v.number(),
      error: v.union(v.string(), v.null()),
    }),
  }),
  handler: async (ctx) => {
    const results: {
      events: { synced: number; error: string | null };
      eventFollows: { synced: number; error: string | null };
    } = {
      events: { synced: 0, error: null },
      eventFollows: { synced: 0, error: null },
    };

    // Sync events
    try {
      const eventResult = await ctx.runAction(
        internal.planetscaleSync.syncEvents,
      );
      results.events.synced = eventResult.synced;
    } catch (error) {
      results.events.error = String(error);
    }

    // Sync event follows
    try {
      const followResult = await ctx.runAction(
        internal.planetscaleSync.syncEventFollows,
      );
      results.eventFollows.synced = followResult.synced;
    } catch (error) {
      results.eventFollows.error = String(error);
    }

    console.log("Sync results:", results);
    return results;
  },
});
