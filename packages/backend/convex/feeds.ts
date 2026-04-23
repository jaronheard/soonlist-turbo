import type { PaginationOptions } from "convex/server";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { userFeedsAggregate } from "./aggregates";
import { getEventById } from "./model/events";
import { getViewableListIds } from "./model/lists";

async function getUserId(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  return identity.subject;
}

async function resolveSourceListDetails(
  ctx: QueryCtx,
  feedEntries: { sourceListId?: string }[],
): Promise<
  Map<
    string,
    { name: string; slug?: string; userId: string; visibility: string }
  >
> {
  const listIds = [
    ...new Set(
      feedEntries.map((e) => e.sourceListId).filter((id): id is string => !!id),
    ),
  ];
  if (listIds.length === 0) return new Map();

  const lists = await Promise.all(
    listIds.map((id) =>
      ctx.db
        .query("lists")
        .withIndex("by_custom_id", (q) => q.eq("id", id))
        .first(),
    ),
  );

  const map = new Map<
    string,
    { name: string; slug?: string; userId: string; visibility: string }
  >();
  listIds.forEach((id, i) => {
    const list = lists[i];
    if (list)
      map.set(id, {
        name: list.name,
        slug: list.slug ?? undefined,
        userId: list.userId,
        visibility: list.visibility,
      });
  });
  return map;
}

async function queryFeed(
  ctx: QueryCtx,
  feedId: string,
  paginationOpts: PaginationOptions,
  filter: "upcoming" | "past" = "upcoming",
) {
  const hasEnded = filter === "past";
  const order = filter === "upcoming" ? "asc" : "desc";

  const feedQuery = ctx.db
    .query("userFeeds")
    .withIndex("by_feed_hasEnded_startTime", (q) =>
      q.eq("feedId", feedId).eq("hasEnded", hasEnded),
    )
    .order(order);

  const feedResults = await feedQuery.paginate(paginationOpts);

  const viewerId = await getUserId(ctx);
  const sourceListDetailsMap = await resolveSourceListDetails(
    ctx,
    feedResults.page,
  );

  const events = await Promise.all(
    feedResults.page.map(async (feedEntry) => {
      const event = await getEventById(ctx, feedEntry.eventId);
      if (!event) return null;

      const viewableListIds = await getViewableListIds(
        ctx,
        event.lists ?? [],
        viewerId,
      );

      const viewerFilteredLists = (event.lists ?? []).filter((l) =>
        viewableListIds.has(l.id),
      );

      const sourceListDetails = feedEntry.sourceListId
        ? sourceListDetailsMap.get(feedEntry.sourceListId)
        : undefined;
      const sourceListVisible =
        !!sourceListDetails &&
        !!feedEntry.sourceListId &&
        viewableListIds.has(feedEntry.sourceListId);

      const additionalSourceCount = viewerFilteredLists.filter(
        (l) => !l.isSystemList && l.id !== feedEntry.sourceListId,
      ).length;
      return {
        ...event,
        lists: viewerFilteredLists,
        sourceListId: sourceListVisible ? feedEntry.sourceListId : undefined,
        sourceListName: sourceListVisible ? sourceListDetails.name : undefined,
        sourceListSlug: sourceListVisible ? sourceListDetails.slug : undefined,
        additionalSourceCount,
      };
    }),
  );

  const validEvents = events.filter((event) => event !== null);

  return {
    ...feedResults,
    page: validEvents,
  };
}

async function queryGroupedFeed(
  ctx: QueryCtx,
  feedId: string,
  paginationOpts: PaginationOptions,
  filter: "upcoming" | "past" = "upcoming",
) {
  const hasEnded = filter === "past";
  const order = filter === "upcoming" ? "asc" : "desc";

  const groupedQuery = ctx.db
    .query("userFeedGroups")
    .withIndex("by_feed_hasEnded_startTime", (q) =>
      q.eq("feedId", feedId).eq("hasEnded", hasEnded),
    )
    .order(order);

  const groupedResults = await groupedQuery.paginate(paginationOpts);

  const primaryFeedEntries = await Promise.all(
    groupedResults.page.map((groupEntry) =>
      ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", feedId).eq("eventId", groupEntry.primaryEventId),
        )
        .first(),
    ),
  );

  const viewerId = await getUserId(ctx);
  const sourceEntries = primaryFeedEntries
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .map((e) => ({ sourceListId: e.sourceListId }));
  const sourceListDetailsMap = await resolveSourceListDetails(
    ctx,
    sourceEntries,
  );

  const enrichedGroups = await Promise.all(
    groupedResults.page.map(async (groupEntry, idx) => {
      const event = await getEventById(ctx, groupEntry.primaryEventId);

      if (!event) {
        return null;
      }

      const feedEntry = primaryFeedEntries[idx];
      const sourceListId = feedEntry?.sourceListId;

      const viewableListIds = await getViewableListIds(
        ctx,
        event.lists ?? [],
        viewerId,
      );

      const viewerFilteredLists = (event.lists ?? []).filter((l) =>
        viewableListIds.has(l.id),
      );

      const sourceListDetails = sourceListId
        ? sourceListDetailsMap.get(sourceListId)
        : undefined;
      const sourceListVisible =
        !!sourceListDetails &&
        !!sourceListId &&
        viewableListIds.has(sourceListId);

      const additionalSourceCount = viewerFilteredLists.filter(
        (l) => !l.isSystemList && l.id !== sourceListId,
      ).length;

      return {
        event: { ...event, lists: viewerFilteredLists },
        similarEventsCount: groupEntry.similarEventsCount,
        similarityGroupId: groupEntry.similarityGroupId,
        sourceListId: sourceListVisible ? sourceListId : undefined,
        sourceListName: sourceListVisible ? sourceListDetails.name : undefined,
        sourceListSlug: sourceListVisible ? sourceListDetails.slug : undefined,
        additionalSourceCount,
      };
    }),
  );

  const validGroups = enrichedGroups.filter((group) => group !== null);

  return {
    ...groupedResults,
    page: validGroups,
  };
}

export const getFeed = query({
  args: {
    feedId: v.string(),
    paginationOpts: paginationOptsValidator,
    filter: v.union(v.literal("upcoming"), v.literal("past")),
  },
  handler: async (ctx, { feedId, paginationOpts, filter }) => {
    if (feedId.startsWith("user_")) {
      const requestedUserId = feedId.replace("user_", "");
      const currentUserId = await getUserId(ctx);

      if (!currentUserId) {
        throw new ConvexError("Authentication required to access user feeds");
      }

      if (requestedUserId !== currentUserId) {
        throw new ConvexError("Unauthorized access to user feed");
      }
    }

    return queryFeed(ctx, feedId, paginationOpts, filter);
  },
});

export const getMyFeed = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
  },
  handler: async (ctx, { paginationOpts, filter = "upcoming" }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const feedId = `user_${userId}`;

    return queryFeed(ctx, feedId, paginationOpts, filter);
  },
});

export const getMyFeedGrouped = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
  },
  handler: async (ctx, { paginationOpts, filter = "upcoming" }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const feedId = `user_${userId}`;

    return queryGroupedFeed(ctx, feedId, paginationOpts, filter);
  },
});

export const getFollowedListsFeed = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
  },
  handler: async (ctx, { paginationOpts, filter = "upcoming" }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    const feedId = `followedLists_${userId}`;

    return queryFeed(ctx, feedId, paginationOpts, filter);
  },
});

export const getFollowedUsersFeed = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
  },
  handler: async (ctx, { paginationOpts, filter = "upcoming" }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new ConvexError("Authentication required");
    }

    const feedId = `followedUsers_${userId}`;

    return queryFeed(ctx, feedId, paginationOpts, filter);
  },
});

export const getDiscoverFeed = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
  },
  handler: async (ctx, { paginationOpts, filter = "upcoming" }) => {
    const feedId = "discover";
    return queryFeed(ctx, feedId, paginationOpts, filter);
  },
});

export const getPublicUserFeed = query({
  args: {
    username: v.string(),
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
  },
  handler: async (ctx, { username, paginationOpts, filter = "upcoming" }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const feedId = `user_${user.id}`;
    const hasEnded = filter === "past";
    const order = filter === "upcoming" ? "asc" : "desc";

    const feedQuery = ctx.db
      .query("userFeeds")
      .withIndex("by_feed_visibility_hasEnded_startTime", (q) =>
        q
          .eq("feedId", feedId)
          .eq("eventVisibility", "public")
          .eq("hasEnded", hasEnded),
      )
      .order(order);

    const feedResults = await feedQuery.paginate(paginationOpts);

    const events = await Promise.all(
      feedResults.page.map((entry) => getEventById(ctx, entry.eventId)),
    );

    return { ...feedResults, page: events.filter((e) => e !== null) };
  },
});

const PUBLIC_FEED_LAST_UPDATED_TAKE = 100;

async function sampleMaxAddedAt(
  ctx: QueryCtx,
  feedId: string,
  hasEnded: boolean,
): Promise<number> {
  const order = hasEnded ? "desc" : "asc";
  const rows = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_visibility_hasEnded_startTime", (q) =>
      q
        .eq("feedId", feedId)
        .eq("eventVisibility", "public")
        .eq("hasEnded", hasEnded),
    )
    .order(order)
    .take(PUBLIC_FEED_LAST_UPDATED_TAKE);
  let max = 0;
  for (const row of rows) {
    if (row.addedAt > max) max = row.addedAt;
  }
  return max;
}

export const getPublicUserFeedLastUpdated = query({
  args: { username: v.string() },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, { username }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const feedId = `user_${user.id}`;
    const [upcomingMax, pastMax] = await Promise.all([
      sampleMaxAddedAt(ctx, feedId, false),
      sampleMaxAddedAt(ctx, feedId, true),
    ]);
    const max = Math.max(upcomingMax, pastMax);
    return max > 0 ? max : null;
  },
});

export const getPublicListFeedLastUpdated = query({
  args: { slug: v.string() },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, { slug }) => {
    const list = await ctx.db
      .query("lists")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!list) {
      return null;
    }

    const viewerId = await getUserId(ctx);
    const viewable = await getViewableListIds(
      ctx,
      [{ id: list.id, userId: list.userId, visibility: list.visibility }],
      viewerId,
    );
    if (!viewable.has(list.id)) {
      return null;
    }

    const feedId = `list_${list.id}`;
    const [upcomingMax, pastMax] = await Promise.all([
      sampleMaxAddedAt(ctx, feedId, false),
      sampleMaxAddedAt(ctx, feedId, true),
    ]);
    const max = Math.max(upcomingMax, pastMax);
    return max > 0 ? max : null;
  },
});

export const updateHasEndedFlagsBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    updated: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const currentTime = Date.now();
    let updated = 0;

    const result = await ctx.db
      .query("userFeeds")
      .order("asc")
      .paginate({ numItems: batchSize, cursor });

    for (const entry of result.page) {
      const shouldHaveEnded = entry.eventEndTime < currentTime;

      if (entry.hasEnded !== shouldHaveEnded) {
        const oldDoc = entry;
        await ctx.db.patch(entry._id, {
          hasEnded: shouldHaveEnded,
        });
        const updatedDoc = (await ctx.db.get(entry._id))!;
        await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);
        updated++;
      }
    }

    return {
      processed: result.page.length,
      updated,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const getDiscoverEventsForIntegration = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 100 }) => {
    const feedId = "discover";
    const hasEnded = false;

    const feedQuery = ctx.db
      .query("userFeeds")
      .withIndex("by_feed_hasEnded_startTime", (q) =>
        q.eq("feedId", feedId).eq("hasEnded", hasEnded),
      )
      .order("asc");

    const feedEntries: {
      eventId: string;
      eventStartTime: number;
    }[] = [];
    for await (const entry of feedQuery) {
      feedEntries.push({
        eventId: entry.eventId,
        eventStartTime: entry.eventStartTime,
      });
      if (feedEntries.length >= limit) {
        break;
      }
    }

    const events = await Promise.all(
      feedEntries.map(async (entry) => {
        const event = await ctx.db
          .query("events")
          .withIndex("by_custom_id", (q) => q.eq("id", entry.eventId))
          .first();

        if (!event) return null;

        const user = await ctx.db
          .query("users")
          .withIndex("by_custom_id", (q) => q.eq("id", event.userId))
          .first();

        return {
          ...event,
          userDisplayName: user?.displayName || event.userName,
        };
      }),
    );

    return events.filter((event) => event !== null);
  },
});

export const updateHasEndedFlagsAction = internalAction({
  args: {},
  returns: v.object({
    totalProcessed: v.number(),
    totalUpdated: v.number(),
  }),
  handler: async (ctx) => {
    let totalProcessed = 0;
    let totalUpdated = 0;
    let cursor: string | null = null;
    const batchSize = 2048;

    while (true) {
      const result: {
        processed: number;
        updated: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(internal.feeds.updateHasEndedFlagsBatch, {
        cursor,
        batchSize,
      });

      totalProcessed += result.processed;
      totalUpdated += result.updated;

      if (result.isDone) {
        break;
      }
      cursor = result.nextCursor;
    }

    console.log(
      `Updated hasEnded flags: ${totalUpdated} changed out of ${totalProcessed} processed`,
    );

    return {
      totalProcessed,
      totalUpdated,
    };
  },
});

export const updateGroupedHasEndedFlagsBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  returns: v.object({
    processed: v.number(),
    updated: v.number(),
    nextCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor, batchSize }) => {
    const currentTime = Date.now();
    let updated = 0;

    const result = await ctx.db
      .query("userFeedGroups")
      .order("asc")
      .paginate({ numItems: batchSize, cursor });

    for (const entry of result.page) {
      const shouldHaveEnded = entry.eventEndTime < currentTime;

      if (entry.hasEnded !== shouldHaveEnded) {
        await ctx.db.patch(entry._id, {
          hasEnded: shouldHaveEnded,
        });
        updated++;
      }
    }

    return {
      processed: result.page.length,
      updated,
      nextCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const updateGroupedHasEndedFlagsAction = internalAction({
  args: {},
  returns: v.object({
    totalProcessed: v.number(),
    totalUpdated: v.number(),
  }),
  handler: async (ctx) => {
    let totalProcessed = 0;
    let totalUpdated = 0;
    let cursor: string | null = null;
    const batchSize = 2048;

    while (true) {
      const result: {
        processed: number;
        updated: number;
        nextCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(
        internal.feeds.updateGroupedHasEndedFlagsBatch,
        {
          cursor,
          batchSize,
        },
      );

      totalProcessed += result.processed;
      totalUpdated += result.updated;

      if (result.isDone) {
        break;
      }
      cursor = result.nextCursor;
    }

    console.log(
      `Updated grouped hasEnded flags: ${totalUpdated} changed out of ${totalProcessed} processed`,
    );

    return {
      totalProcessed,
      totalUpdated,
    };
  },
});
