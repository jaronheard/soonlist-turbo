import { Migrations } from "@convex-dev/migrations";

import type { DataModel } from "../_generated/dataModel.js";
import { components, internal } from "../_generated/api.js";

export const migrations = new Migrations<DataModel>(components.migrations);

const PDX_DISCOVER_LIST_ID = "pdx-discover";

export const migrateDiscoverToSystemList = migrations.define({
  table: "users",
  batchSize: 100,
  migrateOne: async (ctx, user) => {
    const showDiscover =
      (user.publicMetadata as { showDiscover?: boolean } | null)
        ?.showDiscover ?? false;

    if (!showDiscover) {
      return;
    }

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
        addedBy: "migration_discover_list",
      });
    }

    await ctx.runMutation(internal.lists.followSystemList, {
      userId: user.id,
      listId: PDX_DISCOVER_LIST_ID,
    });

    const discoverEntries = await ctx.db
      .query("userFeeds")
      .withIndex("by_feed_visibility_hasEnded_startTime", (q) =>
        q.eq("feedId", "discover").eq("eventVisibility", "public"),
      )
      .collect();

    for (const entry of discoverEntries) {
      const existingEventToList = await ctx.db
        .query("eventToLists")
        .withIndex("by_event_and_list", (q) =>
          q.eq("eventId", entry.eventId).eq("listId", PDX_DISCOVER_LIST_ID),
        )
        .first();

      if (!existingEventToList) {
        await ctx.db.insert("eventToLists", {
          eventId: entry.eventId,
          listId: PDX_DISCOVER_LIST_ID,
        });
      }
    }
  },
});

export const createPdxDiscoverList = migrations.define({
  table: "users",
  batchSize: 1,
  migrateOne: async (ctx, user) => {
    const existing = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", PDX_DISCOVER_LIST_ID))
      .first();

    if (!existing) {
      await ctx.db.insert("lists", {
        id: PDX_DISCOVER_LIST_ID,
        userId: user.id,
        name: "PDX Discover",
        description: "Public Portland events from local contributors.",
        visibility: "public",
        contribution: "restricted",
        listType: "contributor",
        isSystemList: true,
        systemListType: "discover",
        created_at: new Date().toISOString(),
        updatedAt: null,
      });
    }
  },
});
