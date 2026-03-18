import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { getOrCreatePersonalList } from "../lists";

/**
 * Batch mutation: create personal lists for a page of users and backfill eventToLists
 */
export const personalListBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    created: v.number(),
    linked: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const result = await ctx.db
      .query("users")
      .paginate({ numItems: batchSize, cursor });

    let created = 0;
    let linked = 0;

    for (const user of result.page) {
      // Create personal list (idempotent)
      const personalList = await getOrCreatePersonalList(ctx, user.id);

      // Check if this was newly created (no events linked yet)
      const existingLink = await ctx.db
        .query("eventToLists")
        .withIndex("by_list", (q) => q.eq("listId", personalList.id))
        .first();

      if (!existingLink) {
        created++;
      }

      // Backfill eventToLists for this user's events → personal list
      const events = await ctx.db
        .query("events")
        .withIndex("by_user", (q) => q.eq("userId", user.id))
        .collect();

      for (const event of events) {
        const existing = await ctx.db
          .query("eventToLists")
          .withIndex("by_event_and_list", (q) =>
            q.eq("eventId", event.id).eq("listId", personalList.id),
          )
          .first();

        if (!existing) {
          await ctx.db.insert("eventToLists", {
            eventId: event.id,
            listId: personalList.id,
          });
          linked++;
        }
      }
    }

    return {
      processed: result.page.length,
      created,
      linked,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
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
    let totalLinked = 0;
    let cursor: string | null = null;
    const batchSize = 50;

    while (true) {
      const result: {
        processed: number;
        created: number;
        linked: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.migrations.personalListMigration.personalListBatch,
        { cursor, batchSize },
      );

      totalProcessed += result.processed;
      totalCreated += result.created;
      totalLinked += result.linked;

      if (result.isDone) break;
      if (result.nextCursor === cursor) {
        console.error("Cursor stalled in personalListMigration — aborting");
        break;
      }
      cursor = result.nextCursor;
    }

    console.log(
      `Personal list migration: ${totalProcessed} users processed, ${totalCreated} lists created, ${totalLinked} events linked`,
    );
    return null;
  },
});
