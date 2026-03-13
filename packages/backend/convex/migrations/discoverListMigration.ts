import { v } from "convex/values";

import { internal } from "../_generated/api.js";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server.js";
import { userFeedsAggregate } from "../aggregates.js";
import { generatePublicId } from "../utils.js";

// Clerk user ID for the Soonlist system user
const SYSTEM_USER_CLERK_ID = "user_3Aj06gNbZFN6UvIdklcPxLOt8v4";
const PDX_DISCOVER_SLUG = "pdx-discover";

const FOLLOWER_BATCH_SIZE = 10;

/**
 * Step 1: Create the PDX Discover system list
 */
export const createPdxDiscoverList = internalMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Check if already exists
    const existing = await ctx.db
      .query("lists")
      .withIndex("by_slug", (q) => q.eq("slug", PDX_DISCOVER_SLUG))
      .first();

    if (existing) {
      console.log("PDX Discover list already exists:", existing.id);
      return existing.id;
    }

    // Look up system user by Clerk ID
    const systemUser = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", SYSTEM_USER_CLERK_ID))
      .first();

    if (!systemUser) {
      throw new Error(
        `System user ${SYSTEM_USER_CLERK_ID} not found. Create this user in Clerk first.`,
      );
    }

    const listId = generatePublicId();
    await ctx.db.insert("lists", {
      id: listId,
      userId: SYSTEM_USER_CLERK_ID,
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
    // Query users with pagination
    const result = await ctx.db
      .query("users")
      .paginate({ numItems: batchSize, cursor });

    let migrated = 0;

    for (const user of result.page) {
      const showDiscover =
        (user.publicMetadata as { showDiscover?: boolean } | null)
          ?.showDiscover ?? false;

      if (!showDiscover) {
        continue;
      }

      // Add as contributor
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

      // Schedule backfill of contributor's existing events into the list
      await ctx.scheduler.runAfter(
        0,
        internal.lists.backfillContributorEvents,
        { listId, contributorUserId: user.id },
      );

      // Add as follower
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
    // Query discover feed entries
    const result = await ctx.db
      .query("userFeeds")
      .withIndex("by_feed_hasEnded_startTime", (q) =>
        q.eq("feedId", "discover"),
      )
      .paginate({ numItems: batchSize, cursor });

    let migrated = 0;

    for (const entry of result.page) {
      // Add to eventToLists if not already there
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

    // Step 1: Create the list
    const listId: string = await ctx.runMutation(
      internal.migrations.discoverListMigration.createPdxDiscoverList,
      {},
    );
    console.log("List ID:", listId);

    // Step 2: Migrate users
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

    // Step 3: Migrate feed entries to eventToLists
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

    // Step 4: Backfill follower feeds (add list events to each follower's feed)
    // Process followers in paginated batches to avoid loading all follower IDs at once
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

    // Step 5: Clean up old discover feed entries
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

    console.log("=== PDX Discover Migration Complete ===");
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
