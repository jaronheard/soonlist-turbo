import { v } from "convex/values";

import type { IdentifyUserParams } from "./model/posthog";
import { internal } from "./_generated/api";
import { internalAction, internalQuery } from "./_generated/server";
import * as PostHog from "./model/posthog";

interface UserStats {
  userId: string;
  upcoming_created_events_count: number;
  upcoming_saved_events_count: number;
  upcoming_events_count: number;
  total_events_created: number;
  next_event_date: string | null;
  days_since_last_event_created: number | null;
}

const userStatsValidator = v.object({
  userId: v.string(),
  upcoming_created_events_count: v.number(),
  upcoming_saved_events_count: v.number(),
  upcoming_events_count: v.number(),
  total_events_created: v.number(),
  next_event_date: v.union(v.string(), v.null()),
  days_since_last_event_created: v.union(v.number(), v.null()),
});

/**
 * Debug query to check stats for a specific user by username
 */
export const debugUserStats = internalQuery({
  args: { username: v.string() },
  returns: v.union(userStatsValidator, v.null()),
  handler: async (ctx, args) => {
    const now = new Date();
    const nowIso = now.toISOString();

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (!user) return null;

    const createdEvents = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();

    console.log(`User ${args.username} (id: ${user.id})`);
    console.log(`Total created events: ${createdEvents.length}`);
    console.log(`Now ISO: ${nowIso}`);

    const upcomingCreatedEvents = createdEvents.filter(
      (event) => event.endDateTime > nowIso,
    );
    console.log(`Upcoming created events: ${upcomingCreatedEvents.length}`);

    const eventFollows = await ctx.db
      .query("eventFollows")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();
    console.log(`Event follows: ${eventFollows.length}`);

    const savedEventIds = eventFollows.map((f) => f.eventId);
    const savedEvents = await Promise.all(
      savedEventIds.map((eventId) =>
        ctx.db
          .query("events")
          .withIndex("by_custom_id", (q) => q.eq("id", eventId))
          .first(),
      ),
    );

    const upcomingSavedEvents = savedEvents.filter(
      (event): event is NonNullable<typeof event> =>
        event !== null && event.endDateTime > nowIso,
    );
    console.log(`Upcoming saved events: ${upcomingSavedEvents.length}`);

    const upcoming_events_count =
      upcomingCreatedEvents.length + upcomingSavedEvents.length;

    const allUpcomingEvents = [
      ...upcomingCreatedEvents,
      ...upcomingSavedEvents,
    ];

    let next_event_date: string | null = null;
    if (allUpcomingEvents.length > 0) {
      const sortedUpcoming = allUpcomingEvents.sort((a, b) =>
        a.startDateTime.localeCompare(b.startDateTime),
      );
      next_event_date = sortedUpcoming[0]?.startDateTime ?? null;
    }

    let days_since_last_event_created: number | null = null;
    if (createdEvents.length > 0) {
      const sortedByCreation = createdEvents.sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      );
      const lastCreatedAt = sortedByCreation[0]?.created_at;
      console.log(`Last created at: ${lastCreatedAt}`);
      if (lastCreatedAt) {
        const lastDate = new Date(lastCreatedAt);
        const diffMs = now.getTime() - lastDate.getTime();
        days_since_last_event_created = Math.floor(
          diffMs / (1000 * 60 * 60 * 24),
        );
      }
    }

    return {
      userId: user.id,
      upcoming_created_events_count: upcomingCreatedEvents.length,
      upcoming_saved_events_count: upcomingSavedEvents.length,
      upcoming_events_count,
      total_events_created: createdEvents.length,
      next_event_date,
      days_since_last_event_created,
    };
  },
});

/**
 * Fetch all users with computed stats for PostHog sync
 */
export const getAllUsersWithStatsQuery = internalQuery({
  args: {},
  returns: v.array(userStatsValidator),
  handler: async (ctx) => {
    const now = new Date();
    const nowIso = now.toISOString();

    const users = await ctx.db.query("users").collect();

    const userStats = await Promise.all(
      users.map(async (user) => {
        const createdEvents = await ctx.db
          .query("events")
          .withIndex("by_user", (q) => q.eq("userId", user.id))
          .collect();

        const total_events_created = createdEvents.length;

        const upcomingCreatedEvents = createdEvents.filter(
          (event) => event.endDateTime > nowIso,
        );
        const upcoming_created_events_count = upcomingCreatedEvents.length;

        const eventFollows = await ctx.db
          .query("eventFollows")
          .withIndex("by_user", (q) => q.eq("userId", user.id))
          .collect();

        const savedEventIds = eventFollows.map((f) => f.eventId);
        const savedEvents = await Promise.all(
          savedEventIds.map((eventId) =>
            ctx.db
              .query("events")
              .withIndex("by_custom_id", (q) => q.eq("id", eventId))
              .first(),
          ),
        );

        const upcomingSavedEvents = savedEvents.filter(
          (event): event is NonNullable<typeof event> =>
            event !== null && event.endDateTime > nowIso,
        );
        const upcoming_saved_events_count = upcomingSavedEvents.length;

        const upcoming_events_count =
          upcoming_created_events_count + upcoming_saved_events_count;

        const allUpcomingEvents = [
          ...upcomingCreatedEvents,
          ...upcomingSavedEvents,
        ];

        let next_event_date: string | null = null;
        if (allUpcomingEvents.length > 0) {
          const sortedUpcoming = allUpcomingEvents.sort((a, b) =>
            a.startDateTime.localeCompare(b.startDateTime),
          );
          next_event_date = sortedUpcoming[0]?.startDateTime ?? null;
        }

        let days_since_last_event_created: number | null = null;
        if (createdEvents.length > 0) {
          const sortedByCreation = createdEvents.sort((a, b) =>
            b.created_at.localeCompare(a.created_at),
          );
          const lastCreatedAt = sortedByCreation[0]?.created_at;
          if (lastCreatedAt) {
            const lastDate = new Date(lastCreatedAt);
            const diffMs = now.getTime() - lastDate.getTime();
            days_since_last_event_created = Math.floor(
              diffMs / (1000 * 60 * 60 * 24),
            );
          }
        }

        return {
          userId: user.id,
          upcoming_created_events_count,
          upcoming_saved_events_count,
          upcoming_events_count,
          total_events_created,
          next_event_date,
          days_since_last_event_created,
        };
      }),
    );

    return userStats;
  },
});

/**
 * Sync user properties to PostHog (called by daily cron)
 */
export const syncUserPropertiesToPostHog = internalAction({
  args: {},
  returns: v.object({
    success: v.boolean(),
    totalProcessed: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    const userStats: UserStats[] = await ctx.runQuery(
      internal.posthog.getAllUsersWithStatsQuery,
    );

    if (userStats.length === 0) {
      return {
        success: true,
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
      };
    }

    const usersToIdentify: IdentifyUserParams[] = userStats.map((stats) => ({
      userId: stats.userId,
      properties: {
        upcoming_created_events_count: stats.upcoming_created_events_count,
        upcoming_saved_events_count: stats.upcoming_saved_events_count,
        upcoming_events_count: stats.upcoming_events_count,
        total_events_created: stats.total_events_created,
        next_event_date: stats.next_event_date,
        days_since_last_event_created: stats.days_since_last_event_created,
      },
    }));

    const result = await PostHog.batchIdentifyUsers(usersToIdentify);

    console.log("PostHog user sync completed", {
      totalProcessed: userStats.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
    });

    return {
      success: result.success,
      totalProcessed: userStats.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
      error: result.error,
    };
  },
});
