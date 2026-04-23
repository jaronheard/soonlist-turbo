import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { addEventToListFeedInline } from "../feedHelpers";
import { getOrCreatePersonalList } from "../lists";

const EVENTS_PER_BATCH = 100;

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
      const personalList = await getOrCreatePersonalList(ctx, user.id);

      const existingLink = await ctx.db
        .query("eventToLists")
        .withIndex("by_list", (q) => q.eq("listId", personalList.id))
        .first();

      if (!existingLink) {
        created++;
      }

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

export const backfillUserEventsBatch = internalMutation({
  args: {
    userId: v.string(),
    listId: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({
    linked: v.number(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { userId, listId, cursor }) => {
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
        await addEventToListFeedInline(ctx, event.id, listId);
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
        },
      );
    } else if (!result.isDone) {
      console.error(
        `backfillUserEventsBatch: cursor stalled for user ${userId} list ${listId} at cursor ${cursor} — aborting`,
      );
    }

    return { linked, isDone: result.isDone };
  },
});

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
