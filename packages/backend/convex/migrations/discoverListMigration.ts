import { Migrations } from "@convex-dev/migrations";

import type { DataModel } from "../_generated/dataModel.js";
import { components, internal } from "../_generated/api.js";

export const migrations = new Migrations<DataModel>(components.migrations);

const PDX_DISCOVER_LIST_ID = "pdx-discover";
const SYSTEM_USER_ID = "system";

/**
 * Step 1: Create the PDX Discover system list if it doesn't already exist.
 * Run this migration first (it operates on the users table but only creates the list once).
 */
export const createPdxDiscoverList = migrations.define({
  table: "users",
  batchSize: 1,
  migrateOne: async (ctx, _user) => {
    // Check if the list already exists
    const existing = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", PDX_DISCOVER_LIST_ID))
      .first();

    if (existing) {
      return;
    }

    await ctx.db.insert("lists", {
      id: PDX_DISCOVER_LIST_ID,
      userId: SYSTEM_USER_ID,
      name: "PDX Discover",
      description:
        "Portland events from the Soonlist community. Follow to see events in your feed.",
      visibility: "public",
      contribution: "restricted",
      listType: "contributor",
      isSystemList: true,
      systemListType: "discover",
      created_at: new Date().toISOString(),
      updatedAt: null,
    });

    console.log("Created PDX Discover system list");
  },
});

export const runCreatePdxDiscoverList = migrations.runner(
  // @ts-expect-error -- Generated types will be available after `npx convex dev` runs
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Generated types not yet available for new migration file
  internal.migrations.discoverListMigration.createPdxDiscoverList,
);

/**
 * Step 2: Migrate showDiscover=true users to both contributors and followers.
 * For each user with showDiscover=true in their publicMetadata:
 * - Add them as a listContributor of PDX Discover
 * - Add them as a listFollow of PDX Discover
 */
export const migrateDiscoverUsers = migrations.define({
  table: "users",
  batchSize: 50,
  migrateOne: async (ctx, user) => {
    const publicMetadata = user.publicMetadata as {
      showDiscover?: boolean;
    } | null;

    if (!publicMetadata?.showDiscover) {
      return;
    }

    // Add as contributor (if not already)
    const existingContributor = await ctx.db
      .query("listContributors")
      .withIndex("by_list_and_user", (q) =>
        q.eq("listId", PDX_DISCOVER_LIST_ID).eq("userId", user.id),
      )
      .first();

    if (!existingContributor) {
      await ctx.db.insert("listContributors", {
        listId: PDX_DISCOVER_LIST_ID,
        userId: user.id,
        addedAt: new Date().toISOString(),
        addedBy: SYSTEM_USER_ID,
      });
    }

    // Add as follower (if not already)
    const existingFollow = await ctx.db
      .query("listFollows")
      .withIndex("by_user_and_list", (q) =>
        q.eq("userId", user.id).eq("listId", PDX_DISCOVER_LIST_ID),
      )
      .first();

    if (!existingFollow) {
      await ctx.db.insert("listFollows", {
        userId: user.id,
        listId: PDX_DISCOVER_LIST_ID,
      });
    }

    console.log(
      `Migrated user ${user.id} (${user.username}) to PDX Discover contributor + follower`,
    );
  },
});

export const runMigrateDiscoverUsers = migrations.runner(
  // @ts-expect-error -- Generated types will be available after `npx convex dev` runs
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Generated types not yet available for new migration file
  internal.migrations.discoverListMigration.migrateDiscoverUsers,
);

/**
 * Step 3: Backfill discover feed events into the PDX Discover list's eventToLists.
 * Takes all events currently in the "discover" feed and adds them to the PDX Discover list.
 */
export const backfillDiscoverEvents = migrations.define({
  table: "userFeeds",
  batchSize: 100,
  migrateOne: async (ctx, feedEntry) => {
    if (feedEntry.feedId !== "discover") {
      return;
    }

    // Check if event is already in the PDX Discover list
    const existing = await ctx.db
      .query("eventToLists")
      .withIndex("by_event_and_list", (q) =>
        q.eq("eventId", feedEntry.eventId).eq("listId", PDX_DISCOVER_LIST_ID),
      )
      .first();

    if (!existing) {
      await ctx.db.insert("eventToLists", {
        eventId: feedEntry.eventId,
        listId: PDX_DISCOVER_LIST_ID,
      });
    }
  },
});

export const runBackfillDiscoverEvents = migrations.runner(
  // @ts-expect-error -- Generated types will be available after `npx convex dev` runs
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Generated types not yet available for new migration file
  internal.migrations.discoverListMigration.backfillDiscoverEvents,
);
