import { v } from "convex/values";

import { internal } from "../_generated/api.js";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server.js";
import { userFeedsAggregate } from "../aggregates.js";
import { upsertFeedEntry } from "../feedHelpers.js";
import { generatePublicId } from "../utils.js";

const SYSTEM_USER_USERNAME = "soonlist";
const PDX_DISCOVER_SLUG = "pdx-discover";

const FOLLOWER_BATCH_SIZE = 10;

/**
 * Step 1: Create the PDX Discover system list
 */
export const createPdxDiscoverList = internalMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("lists")
      .withIndex("by_slug", (q) => q.eq("slug", PDX_DISCOVER_SLUG))
      .first();

    if (existing) {
      console.log("PDX Discover list already exists:", existing.id);
      return existing.id;
    }

    const systemUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", SYSTEM_USER_USERNAME))
      .first();

    if (!systemUser) {
      throw new Error(
        `System user with username "${SYSTEM_USER_USERNAME}" not found.`,
      );
    }

    const listId = generatePublicId();
    await ctx.db.insert("lists", {
      id: listId,
      userId: systemUser.id,
      name: "PDX Discover",
      description:
        "A community-curated list of events in Portland. Contributors' public events automatically appear here.",
      visibility: "public",
      contribution: "restricted",
      listType: "contributor",
      isSystemList: true,
      systemListType: "discover",
      slug: PDX_DISCOVER_SLUG,
      created_at: new Date().toISOString(),
      updatedAt: null,
    });

    console.log("Created PDX Discover list with ID:", listId);
    return listId;
  },
});

/**
 * Step 2: Migrate showDiscover=true users to contributors + followers
 * Processes in batches to avoid transaction limits
 */
export const migrateDiscoverUsersBatch = internalMutation({
  args: {
    listId: v.string(),
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    migrated: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { listId, cursor, batchSize }) => {
    const result = await ctx.db
      .query("users")
      .paginate({ numItems: batchSize, cursor });

    let migrated = 0;

    for (const user of result.page) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const showDiscover: boolean =
        (user.publicMetadata as { showDiscover?: boolean } | null)
          ?.showDiscover ?? false;

      if (!showDiscover) {
        continue;
      }

      const existingMember = await ctx.db
        .query("listMembers")
        .withIndex("by_list_and_user", (q) =>
          q.eq("listId", listId).eq("userId", user.id),
        )
        .first();

      if (!existingMember) {
        await ctx.db.insert("listMembers", {
          listId,
          userId: user.id,
          role: "contributor",
        });
      } else if (existingMember.role !== "contributor") {
        await ctx.db.patch(existingMember._id, { role: "contributor" });
      }

      await ctx.scheduler.runAfter(
        0,
        internal.lists.backfillContributorEvents,
        { listId, contributorUserId: user.id },
      );

      const existingFollow = await ctx.db
        .query("listFollows")
        .withIndex("by_user_and_list", (q) =>
          q.eq("userId", user.id).eq("listId", listId),
        )
        .first();

      if (!existingFollow) {
        await ctx.db.insert("listFollows", {
          userId: user.id,
          listId,
        });
      }

      migrated++;
    }

    return {
      processed: result.page.length,
      migrated,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * Step 3: Migrate discover feed entries to eventToLists records
 * and clean up old "discover" feedId entries
 */
export const migrateDiscoverFeedEntriesBatch = internalMutation({
  args: {
    listId: v.string(),
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    migrated: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { listId, cursor, batchSize }) => {
    const result = await ctx.db
      .query("userFeeds")
      .withIndex("by_feed_hasEnded_startTime", (q) =>
        q.eq("feedId", "discover"),
      )
      .paginate({ numItems: batchSize, cursor });

    let migrated = 0;

    for (const entry of result.page) {
      const existing = await ctx.db
        .query("eventToLists")
        .withIndex("by_event_and_list", (q) =>
          q.eq("eventId", entry.eventId).eq("listId", listId),
        )
        .first();

      if (!existing) {
        await ctx.db.insert("eventToLists", {
          eventId: entry.eventId,
          listId,
        });
        migrated++;
      }
    }

    return {
      processed: result.page.length,
      migrated,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * Step 4: Clean up old discover feed entries
 */
export const cleanupDiscoverFeedEntriesBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    deleted: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const result = await ctx.db
      .query("userFeeds")
      .withIndex("by_feed_hasEnded_startTime", (q) =>
        q.eq("feedId", "discover"),
      )
      .paginate({ numItems: batchSize, cursor });

    for (const entry of result.page) {
      await userFeedsAggregate.deleteIfExists(ctx, entry);
      await ctx.db.delete(entry._id);
    }

    return {
      deleted: result.page.length,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * Orchestrator: Run the full migration
 */
export const runDiscoverMigration = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("=== Starting PDX Discover Migration ===");

    const listId: string = await ctx.runMutation(
      internal.migrations.discoverListMigration.createPdxDiscoverList,
      {},
    );
    console.log("List ID:", listId);

    let userCursor: string | null = null;
    let totalUsersMigrated = 0;
    while (true) {
      const result: {
        processed: number;
        migrated: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.migrations.discoverListMigration.migrateDiscoverUsersBatch,
        { listId, cursor: userCursor, batchSize: 50 },
      );
      totalUsersMigrated += result.migrated;
      console.log(
        `Users batch: processed=${result.processed}, migrated=${result.migrated}`,
      );
      if (result.isDone) break;
      if (result.nextCursor === userCursor) {
        console.error(
          "Cursor did not advance — aborting migration loop to prevent infinite loop",
        );
        break;
      }
      userCursor = result.nextCursor;
    }
    console.log(`Total users migrated: ${totalUsersMigrated}`);

    let feedCursor: string | null = null;
    let totalEventsMigrated = 0;
    while (true) {
      const result: {
        processed: number;
        migrated: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.migrations.discoverListMigration
          .migrateDiscoverFeedEntriesBatch,
        { listId, cursor: feedCursor, batchSize: 100 },
      );
      totalEventsMigrated += result.migrated;
      console.log(
        `Feed entries batch: processed=${result.processed}, migrated=${result.migrated}`,
      );
      if (result.isDone) break;
      if (result.nextCursor === feedCursor) {
        console.error(
          "Cursor did not advance — aborting migration loop to prevent infinite loop",
        );
        break;
      }
      feedCursor = result.nextCursor;
    }
    console.log(`Total events migrated to list: ${totalEventsMigrated}`);

    let followerCursor: string | null = null;
    let totalFollowersProcessed = 0;
    while (true) {
      const followerPage: {
        followerIds: string[];
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runQuery(
        internal.migrations.discoverListMigration.getListFollowerIds,
        { listId, cursor: followerCursor, batchSize: FOLLOWER_BATCH_SIZE },
      );
      for (const userId of followerPage.followerIds) {
        await ctx.runMutation(internal.feedHelpers.addListEventsToUserFeed, {
          userId,
          listId,
        });
      }
      totalFollowersProcessed += followerPage.followerIds.length;
      console.log(
        `Follower feed batch: processed ${totalFollowersProcessed} followers so far`,
      );
      if (followerPage.isDone) break;
      if (followerPage.nextCursor === followerCursor) {
        console.error(
          "Cursor did not advance — aborting follower loop to prevent infinite loop",
        );
        break;
      }
      followerCursor = followerPage.nextCursor;
    }
    console.log(`Total follower feeds populated: ${totalFollowersProcessed}`);

    console.log(
      "Step 5: SKIPPED - discover feed cleanup deferred until consumers are migrated",
    );
    /*
    let cleanupCursor: string | null = null;
    let totalDeleted = 0;
    while (true) {
      const result: {
        deleted: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.migrations.discoverListMigration
          .cleanupDiscoverFeedEntriesBatch,
        { cursor: cleanupCursor, batchSize: 100 },
      );
      totalDeleted += result.deleted;
      console.log(`Cleanup batch: deleted=${result.deleted}`);
      if (result.isDone) break;
      if (result.nextCursor === cleanupCursor) {
        console.error(
          "Cursor did not advance — aborting migration loop to prevent infinite loop",
        );
        break;
      }
      cleanupCursor = result.nextCursor;
    }
    console.log(`Total discover feed entries cleaned up: ${totalDeleted}`);
    */

    console.log("=== PDX Discover Migration Complete ===");
  },
});

/**
 * Populate feeds for a single follower (batched).
 * Call once per follower to avoid action timeouts.
 */
export const populateFollowerFeedSingle = internalAction({
  args: {
    listId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { listId, userId }) => {
    let eventCursor: string | null = null;
    let totalProcessed = 0;

    while (true) {
      const result: {
        processed: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.migrations.discoverListMigration.addListEventsToUserFeedBatch,
        { userId, listId, cursor: eventCursor, batchSize: 50 },
      );
      totalProcessed += result.processed;
      if (result.isDone) break;
      if (result.nextCursor === eventCursor) {
        console.error(`Event cursor stalled for user ${userId} — aborting`);
        break;
      }
      eventCursor = result.nextCursor;
    }

    console.log(`User ${userId}: ${totalProcessed} events added to feeds`);
  },
});

/**
 * Step 4 standalone: Schedule feed population for all followers.
 * Each follower gets its own action to avoid overall timeout.
 */
export const populateFollowerFeeds = internalAction({
  args: {
    listId: v.string(),
  },
  handler: async (ctx, { listId }) => {
    let followerCursor: string | null = null;
    let totalScheduled = 0;

    while (true) {
      const page: {
        followerIds: string[];
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runQuery(
        internal.migrations.discoverListMigration.getListFollowerIds,
        { listId, cursor: followerCursor, batchSize: 50 },
      );

      for (const userId of page.followerIds) {
        await ctx.scheduler.runAfter(
          0,
          internal.migrations.discoverListMigration.populateFollowerFeedSingle,
          { listId, userId },
        );
        totalScheduled++;
      }

      console.log(`Scheduled ${totalScheduled} follower feed jobs so far`);

      if (page.isDone) break;
      if (page.nextCursor === followerCursor) {
        console.error("Follower cursor stalled — aborting");
        break;
      }
      followerCursor = page.nextCursor;
    }

    console.log(
      `=== Scheduled ${totalScheduled} follower feed population jobs ===`,
    );
  },
});

/**
 * Batched mutation: add a page of list events to a user's feeds
 */
export const addListEventsToUserFeedBatch = internalMutation({
  args: {
    userId: v.string(),
    listId: v.string(),
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { userId, listId, cursor, batchSize }) => {
    const result = await ctx.db
      .query("eventToLists")
      .withIndex("by_list", (q) => q.eq("listId", listId))
      .paginate({ numItems: batchSize, cursor });

    const currentTime = Date.now();
    const followedListsFeedId = `followedLists_${userId}`;
    const personalFeedId = `user_${userId}`;
    let processed = 0;

    for (const etl of result.page) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", etl.eventId))
        .first();

      if (event?.visibility !== "public") {
        continue;
      }

      const eventStartTime = new Date(event.startDateTime).getTime();
      const eventEndTime = new Date(event.endDateTime).getTime();

      await upsertFeedEntry(
        ctx,
        followedListsFeedId,
        etl.eventId,
        eventStartTime,
        eventEndTime,
        currentTime,
        event.similarityGroupId,
        event.visibility,
      );

      await upsertFeedEntry(
        ctx,
        personalFeedId,
        etl.eventId,
        eventStartTime,
        eventEndTime,
        currentTime,
        event.similarityGroupId,
        event.visibility,
      );

      processed++;
    }

    return {
      processed,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * Helper query for the migration orchestrator — returns paginated follower IDs
 */
export const getListFollowerIds = internalQuery({
  args: {
    listId: v.string(),
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    followerIds: v.array(v.string()),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { listId, cursor, batchSize }) => {
    const result = await ctx.db
      .query("listFollows")
      .withIndex("by_list", (q) => q.eq("listId", listId))
      .paginate({ numItems: batchSize, cursor });
    return {
      followerIds: result.page.map((f) => f.userId),
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/**
 * Cleanup: remove migration-added entries from personal feeds (user_${userId}).
 * Only removes entries where the event is in the PDX Discover list AND
 * addedAt falls within the migration time window.
 * Leaves followedLists_ entries intact.
 */
export const cleanupPersonalFeedBatch = internalMutation({
  args: {
    userId: v.string(),
    listId: v.string(),
    migrationStartMs: v.number(),
    migrationEndMs: v.number(),
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    checked: v.number(),
    removed: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (
    ctx,
    { userId, listId, migrationStartMs, migrationEndMs, cursor, batchSize },
  ) => {
    const personalFeedId = `user_${userId}`;
    const result = await ctx.db
      .query("userFeeds")
      .withIndex("by_feed_hasEnded_startTime", (q) =>
        q.eq("feedId", personalFeedId),
      )
      .paginate({ numItems: batchSize, cursor });

    let removed = 0;

    for (const entry of result.page) {
      if (entry.addedAt < migrationStartMs || entry.addedAt > migrationEndMs) {
        continue;
      }

      const inList = await ctx.db
        .query("eventToLists")
        .withIndex("by_event_and_list", (q) =>
          q.eq("eventId", entry.eventId).eq("listId", listId),
        )
        .first();

      if (inList) {
        await userFeedsAggregate.deleteIfExists(ctx, entry);
        await ctx.db.delete(entry._id);
        removed++;
      }
    }

    return {
      checked: result.page.length,
      removed,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const cleanupPersonalFeedSingle = internalAction({
  args: {
    userId: v.string(),
    listId: v.string(),
    migrationStartMs: v.number(),
    migrationEndMs: v.number(),
  },
  handler: async (
    ctx,
    { userId, listId, migrationStartMs, migrationEndMs },
  ) => {
    let cursor: string | null = null;
    let totalRemoved = 0;

    while (true) {
      const result: {
        checked: number;
        removed: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.migrations.discoverListMigration.cleanupPersonalFeedBatch,
        {
          userId,
          listId,
          migrationStartMs,
          migrationEndMs,
          cursor,
          batchSize: 50,
        },
      );
      totalRemoved += result.removed;
      if (result.isDone) break;
      if (result.nextCursor === cursor) {
        console.error(`Cursor stalled for user ${userId} — aborting`);
        break;
      }
      cursor = result.nextCursor;
    }

    console.log(
      `User ${userId}: removed ${totalRemoved} migration entries from personal feed`,
    );
  },
});

export const cleanupPersonalFeeds = internalAction({
  args: {
    listId: v.string(),
    migrationStartMs: v.number(),
    migrationEndMs: v.number(),
  },
  handler: async (ctx, { listId, migrationStartMs, migrationEndMs }) => {
    let followerCursor: string | null = null;
    let totalScheduled = 0;

    while (true) {
      const page: {
        followerIds: string[];
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runQuery(
        internal.migrations.discoverListMigration.getListFollowerIds,
        { listId, cursor: followerCursor, batchSize: 50 },
      );

      for (const userId of page.followerIds) {
        await ctx.scheduler.runAfter(
          0,
          internal.migrations.discoverListMigration.cleanupPersonalFeedSingle,
          { userId, listId, migrationStartMs, migrationEndMs },
        );
        totalScheduled++;
      }

      if (page.isDone) break;
      if (page.nextCursor === followerCursor) {
        console.error("Follower cursor stalled — aborting");
        break;
      }
      followerCursor = page.nextCursor;
    }

    console.log(`Scheduled ${totalScheduled} personal feed cleanup jobs`);
  },
});
