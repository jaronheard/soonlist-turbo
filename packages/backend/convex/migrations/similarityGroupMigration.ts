import { Migrations } from "@convex-dev/migrations";

import type { DataModel } from "../_generated/dataModel.js";
import { components, internal } from "../_generated/api.js";
import { areEventsSimilar } from "../model/similarityHelpers.js";
import { generatePublicId } from "../utils.js";

export const migrations = new Migrations<DataModel>(components.migrations);

export const backfillEventSimilarityGroups = migrations.define({
  table: "events",
  batchSize: 50,
  migrateOne: async (ctx, event) => {
    if (event.similarityGroupId) {
      return;
    }

    try {
      const startDateTime = new Date(event.startDateTime);
      const windowMs = 2 * 60 * 60 * 1000;
      const lowerBound = new Date(startDateTime.getTime() - windowMs);
      const upperBound = new Date(startDateTime.getTime() + windowMs);

      const candidateEvents = await ctx.db
        .query("events")
        .withIndex("by_startDateTime", (q) =>
          q
            .gte("startDateTime", lowerBound.toISOString())
            .lte("startDateTime", upperBound.toISOString()),
        )
        .filter((q) =>
          q.and(
            q.lt(q.field("created_at"), event.created_at),
            q.neq(q.field("similarityGroupId"), undefined),
          ),
        )
        .collect();

      let foundGroupId: string | null = null;

      for (const candidate of candidateEvents) {
        if (!candidate.similarityGroupId) continue;

        const isSimilar = areEventsSimilar(
          {
            startDateTime: event.startDateTime,
            endDateTime: event.endDateTime,
            name: event.name,
            description: event.description,
            location: event.location,
          },
          {
            startDateTime: candidate.startDateTime,
            endDateTime: candidate.endDateTime,
            name: candidate.name,
            description: candidate.description,
            location: candidate.location,
          },
        );

        if (isSimilar) {
          foundGroupId = candidate.similarityGroupId;
          break;
        }
      }

      const similarityGroupId = foundGroupId || `sg_${generatePublicId()}`;

      await ctx.db.patch(event._id, {
        similarityGroupId,
      });

      console.log(
        `Assigned similarity group ${similarityGroupId} to event ${event.id}`,
      );
    } catch (error) {
      console.error(
        `Failed to assign similarity group to event ${event.id}:`,
        error,
      );
      throw error;
    }
  },
});

export const runBackfillEventSimilarityGroups = migrations.runner(
  internal.migrations.similarityGroupMigration.backfillEventSimilarityGroups,
);

export const backfillUserFeedsSimilarityGroups = migrations.define({
  table: "userFeeds",
  batchSize: 100,
  migrateOne: async (ctx, feedEntry) => {
    if (feedEntry.similarityGroupId) {
      return;
    }

    try {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", feedEntry.eventId))
        .first();

      if (!event) {
        console.log(
          `Event ${feedEntry.eventId} not found for feed entry ${feedEntry._id}`,
        );
        return;
      }

      if (!event.similarityGroupId) {
        console.log(`Event ${feedEntry.eventId} has no similarity group yet`);
        return;
      }

      await ctx.db.patch(feedEntry._id, {
        similarityGroupId: event.similarityGroupId,
      });

      console.log(
        `Assigned similarity group ${event.similarityGroupId} to feed entry ${feedEntry._id}`,
      );
    } catch (error) {
      console.error(
        `Failed to assign similarity group to feed entry ${feedEntry._id}:`,
        error,
      );
      throw error;
    }
  },
});

export const runBackfillUserFeedsSimilarityGroups = migrations.runner(
  internal.migrations.similarityGroupMigration
    .backfillUserFeedsSimilarityGroups,
);

export const deriveUserFeedGroups = migrations.define({
  table: "userFeeds",
  batchSize: 100,
  migrateOne: async (ctx, feedEntry) => {
    if (!feedEntry.similarityGroupId) {
      return;
    }

    try {
      const feedId = feedEntry.feedId;
      const similarityGroupId = feedEntry.similarityGroupId;

      const existingGroupEntry = await ctx.db
        .query("userFeedGroups")
        .withIndex("by_feed_group", (q) =>
          q.eq("feedId", feedId).eq("similarityGroupId", similarityGroupId),
        )
        .first();

      if (existingGroupEntry) {
        return;
      }

      const members = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_group", (q) =>
          q.eq("feedId", feedId).eq("similarityGroupId", similarityGroupId),
        )
        .collect();

      if (members.length === 0) {
        return;
      }

      const memberEvents = await Promise.all(
        members.map(async (m) => {
          return await ctx.db
            .query("events")
            .withIndex("by_custom_id", (q) => q.eq("id", m.eventId))
            .first();
        }),
      );

      const validEvents = memberEvents.filter(
        (e): e is NonNullable<(typeof memberEvents)[number]> => e !== null,
      );

      if (validEvents.length === 0) {
        return;
      }

      const feedUserId = feedId.startsWith("user_")
        ? feedId.replace("user_", "")
        : null;

      let primaryEvent = null;
      if (feedUserId) {
        primaryEvent = validEvents.find((e) => e.userId === feedUserId) || null;
      }

      if (!primaryEvent) {
        primaryEvent = validEvents.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )[0];
      }

      if (!primaryEvent) {
        return;
      }

      const eventStartTime = new Date(primaryEvent.startDateTime).getTime();
      const eventEndTime = new Date(primaryEvent.endDateTime).getTime();
      const currentTime = Date.now();
      const hasEnded = eventEndTime < currentTime;
      const minAddedAt = Math.min(...members.map((m) => m.addedAt));
      const similarEventsCount = Math.max(0, members.length - 1);

      await ctx.db.insert("userFeedGroups", {
        feedId,
        similarityGroupId,
        primaryEventId: primaryEvent.id,
        eventStartTime,
        eventEndTime,
        addedAt: minAddedAt,
        hasEnded,
        similarEventsCount,
      });

      console.log(
        `Created grouped entry for feed ${feedId}, group ${similarityGroupId}`,
      );
    } catch (error) {
      console.error(
        `Failed to create grouped entry for feed ${feedEntry.feedId}:`,
        error,
      );
      throw error;
    }
  },
});

export const runDeriveUserFeedGroups = migrations.runner(
  internal.migrations.similarityGroupMigration.deriveUserFeedGroups,
);
