import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { getOrCreatePersonalList } from "../lists";

const EVENTS_PER_BATCH = 100;

/**
 * Batch mutation: create personal lists for a page of users.
 * Event backfill is scheduled as separate bounded mutations to avoid
 * exceeding Convex transaction document-read limits for power users.
 */
export const personalListBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    created: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const result = await ctx.db
      .query("users")
      .paginate({ numItems: batchSize, cursor });

    let created = 0;

    for (const user of result.page) {
      // Create personal list (idempotent)
      const personalList = await getOrCreatePersonalList(ctx, user.id);

      // Check if any events are already linked
      const existingLink = await ctx.db
        .query("eventToLists")
        .withIndex("by_list", (q) => q.eq("listId", personalList.id))
        .first();

      if (!existingLink) {
        created++;
      }

      // Schedule per-user backfill as a separate transaction so a single
      // power user's events never blow the batch-level read budget.
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.personalListMigration.backfillUserEventsBatch,
        {
          userId: user.id,
          listId: personalList.id,
          cursor: null,
        },
      );
    }

    return {
      processed: result.page.length,
      created,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

const FOLLOWERS_PER_BATCH = 100;

/**
 * Paginated backfill of a single user's events → personal list.
 * Self-schedules the next page to stay under transaction limits.
 *
 * When `hydrateFollowersOnComplete` is true, every current follower's
 * feed is hydrated from the list once the backfill chain finishes — used
 * for lists created on-demand at follow time so followers don't see an
 * empty feed. Only currently-following users are hydrated, so anyone who
 * unfollowed mid-backfill is naturally skipped.
 */
export const backfillUserEventsBatch = internalMutation({
  args: {
    userId: v.string(),
    listId: v.string(),
    cursor: v.union(v.string(), v.null()),
    hydrateFollowersOnComplete: v.optional(v.boolean()),
  },
  returns: v.object({
    linked: v.number(),
    isDone: v.boolean(),
  }),
  handler: async (
    ctx,
    { userId, listId, cursor, hydrateFollowersOnComplete },
  ) => {
    const result = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .paginate({ numItems: EVENTS_PER_BATCH, cursor });

    let linked = 0;

    for (const event of result.page) {
      const existing = await ctx.db
        .query("eventToLists")
        .withIndex("by_event_and_list", (q) =>
          q.eq("eventId", event.id).eq("listId", listId),
        )
        .first();

      if (!existing) {
        await ctx.db.insert("eventToLists", {
          eventId: event.id,
          listId,
        });
        linked++;
      }
    }

    if (!result.isDone && result.continueCursor !== cursor) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.personalListMigration.backfillUserEventsBatch,
        {
          userId,
          listId,
          cursor: result.continueCursor,
          hydrateFollowersOnComplete,
        },
      );
    } else if (!result.isDone) {
      console.error(
        `backfillUserEventsBatch: cursor stalled for user ${userId} list ${listId} at cursor ${cursor} — aborting`,
      );
    } else if (hydrateFollowersOnComplete) {
      // Kick off a paginated follower fan-out. We schedule rather than
      // inline-collect so we don't blow transaction limits for lists that
      // accumulated many followers while the backfill was running.
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.personalListMigration.hydrateListFollowersBatch,
        { listId, cursor: null },
      );
    }

    return { linked, isDone: result.isDone };
  },
});

/**
 * Paginated fan-out: schedule `addListEventsToUserFeed` for each current
 * follower of `listId`. Self-schedules the next page so a list with many
 * followers doesn't exceed transaction limits.
 */
export const hydrateListFollowersBatch = internalMutation({
  args: {
    listId: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, { listId, cursor }) => {
    const result = await ctx.db
      .query("listFollows")
      .withIndex("by_list", (q) => q.eq("listId", listId))
      .paginate({ numItems: FOLLOWERS_PER_BATCH, cursor });

    for (const follow of result.page) {
      await ctx.scheduler.runAfter(
        0,
        internal.feedHelpers.addListEventsToUserFeed,
        { userId: follow.userId, listId },
      );
    }

    if (!result.isDone && result.continueCursor !== cursor) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.personalListMigration.hydrateListFollowersBatch,
        { listId, cursor: result.continueCursor },
      );
    } else if (!result.isDone) {
      console.error(
        `hydrateListFollowersBatch: cursor stalled for list ${listId} at cursor ${cursor} — aborting`,
      );
    }

    return null;
  },
});

/**
 * Action: orchestrate batch processing for personal list migration
 */
export const runPersonalListMigration = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    let totalProcessed = 0;
    let totalCreated = 0;
    let cursor: string | null = null;
    const batchSize = 50;

    while (true) {
      const result: {
        processed: number;
        created: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.migrations.personalListMigration.personalListBatch,
        { cursor, batchSize },
      );

      totalProcessed += result.processed;
      totalCreated += result.created;

      if (result.isDone) break;
      if (result.nextCursor === cursor) {
        console.error("Cursor stalled in personalListMigration — aborting");
        break;
      }
      cursor = result.nextCursor;
    }

    console.log(
      `Personal list migration: ${totalProcessed} users processed, ${totalCreated} lists created (events backfill scheduled per-user)`,
    );
    return null;
  },
});
