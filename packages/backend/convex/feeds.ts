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

// Helper function to get the current user ID from auth
async function getUserId(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  return identity.subject;
}

// Helper to batch-resolve sourceListId → list details (name, slug, and
// visibility metadata used to gate attribution).
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

// Helper function to query feed with common logic
async function queryFeed(
  ctx: QueryCtx,
  feedId: string,
  paginationOpts: PaginationOptions,
  filter: "upcoming" | "past" = "upcoming",
) {
  // Use the new index for efficient filtering
  const hasEnded = filter === "past";
  const order = filter === "upcoming" ? "asc" : "desc";

  const feedQuery = ctx.db
    .query("userFeeds")
    .withIndex("by_feed_hasEnded_startTime", (q) =>
      q.eq("feedId", feedId).eq("hasEnded", hasEnded),
    )
    .order(order);

  // Paginate
  const feedResults = await feedQuery.paginate(paginationOpts);

  // Resolve source list details and capture viewer for visibility checks
  const viewerId = await getUserId(ctx);
  const sourceListDetailsMap = await resolveSourceListDetails(
    ctx,
    feedResults.page,
  );

  // Map feed entries to full events with users and eventFollows, preserving order
  const events = await Promise.all(
    feedResults.page.map(async (feedEntry) => {
      const event = await getEventById(ctx, feedEntry.eventId);
      if (!event) return null;

      // Filter the event's lists down to ones the viewer can actually see
      // before attributing them. Hidden private lists must not contribute to
      // the +N badge or leak their existence (or name) to non-members.
      const viewableListIds = await getViewableListIds(
        ctx,
        event.lists ?? [],
        viewerId,
      );

      // Strip private-unviewable lists from `event.lists` before sending to
      // the client. The "Saved by" modal (SavedByModal) renders this array
      // directly, so any private list that leaks here leaks its name/slug to
      // viewers who can see the event but not the list. System/personal
      // lists are left in place — those are hidden client-side and are not a
      // privacy concern; they can still be useful for other consumers.
      const viewerFilteredLists = (event.lists ?? []).filter((l) =>
        viewableListIds.has(l.id),
      );

      // Gate the primary attribution: if the viewer cannot see the source
      // list, drop its name/slug so we don't leak metadata.
      const sourceListDetails = feedEntry.sourceListId
        ? sourceListDetailsMap.get(feedEntry.sourceListId)
        : undefined;
      const sourceListVisible =
        !!sourceListDetails &&
        !!feedEntry.sourceListId &&
        viewableListIds.has(feedEntry.sourceListId);

      // Count non-system lists this event belongs to BEYOND the source list
      // (the source is already shown inline on the card as "via [List]", so
      // the badge is intentionally labeled "+N additional"). The modal
      // itself is a complete "Saved by" view and renders ALL non-system
      // lists — including the source list — so modal length = N + 1 by
      // design. Don't change this invariant without updating SavedByModal's
      // `visibleLists` and the "+" prefix on the card badge together.
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

  // Filter out null events (should be rare)
  const validEvents = events.filter((event) => event !== null);

  return {
    ...feedResults,
    page: validEvents,
  };
}

// Helper function to query grouped feed using userFeedGroups table
async function queryGroupedFeed(
  ctx: QueryCtx,
  feedId: string,
  paginationOpts: PaginationOptions,
  filter: "upcoming" | "past" = "upcoming",
) {
  const hasEnded = filter === "past";
  const order = filter === "upcoming" ? "asc" : "desc";

  // Query from the grouped feed table
  const groupedQuery = ctx.db
    .query("userFeedGroups")
    .withIndex("by_feed_hasEnded_startTime", (q) =>
      q.eq("feedId", feedId).eq("hasEnded", hasEnded),
    )
    .order(order);

  // Paginate
  const groupedResults = await groupedQuery.paginate(paginationOpts);

  // For each group entry, look up the primary event's feed entry for sourceListId
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

  // Resolve source list details and capture viewer for visibility checks
  const viewerId = await getUserId(ctx);
  const sourceEntries = primaryFeedEntries
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .map((e) => ({ sourceListId: e.sourceListId }));
  const sourceListDetailsMap = await resolveSourceListDetails(
    ctx,
    sourceEntries,
  );

  // Enrich each group entry with the primary event data
  const enrichedGroups = await Promise.all(
    groupedResults.page.map(async (groupEntry, idx) => {
      // Get the primary event with full enrichment
      const event = await getEventById(ctx, groupEntry.primaryEventId);

      if (!event) {
        return null;
      }

      const feedEntry = primaryFeedEntries[idx];
      const sourceListId = feedEntry?.sourceListId;

      // Filter the event's lists down to ones the viewer can actually see
      // before attributing them. Hidden private lists must not contribute to
      // the +N badge or leak their existence (or name) to non-members.
      const viewableListIds = await getViewableListIds(
        ctx,
        event.lists ?? [],
        viewerId,
      );

      // Strip private-unviewable lists from `event.lists` before sending to
      // the client. See matching note in queryFeed — both the "Saved by"
      // modal and the +N badge operate on this single pre-filtered set, so
      // they can never disagree.
      const viewerFilteredLists = (event.lists ?? []).filter((l) =>
        viewableListIds.has(l.id),
      );

      // Gate the primary attribution: if the viewer cannot see the source
      // list, drop its name/slug so we don't leak metadata.
      const sourceListDetails = sourceListId
        ? sourceListDetailsMap.get(sourceListId)
        : undefined;
      const sourceListVisible =
        !!sourceListDetails &&
        !!sourceListId &&
        viewableListIds.has(sourceListId);

      // Count non-system lists beyond the source list. See the matching note
      // in `queryFeed` — the badge reads "+N additional" (source is shown
      // inline on the card) and the modal renders the full set including
      // the source, so modal length = N + 1 by design.
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

  // Filter out null entries (in case primary event was deleted)
  const validGroups = enrichedGroups.filter((group) => group !== null);

  return {
    ...groupedResults,
    page: validGroups,
  };
}

// Main feed query that uses proper hasEnded-based filtering
export const getFeed = query({
  args: {
    feedId: v.string(),
    paginationOpts: paginationOptsValidator,
    filter: v.union(v.literal("upcoming"), v.literal("past")),
  },
  handler: async (ctx, { feedId, paginationOpts, filter }) => {
    // For personal feeds, verify access
    if (feedId.startsWith("user_")) {
      const requestedUserId = feedId.replace("user_", "");
      const currentUserId = await getUserId(ctx);

      // Require authentication for user feeds
      if (!currentUserId) {
        throw new ConvexError("Authentication required to access user feeds");
      }

      // Only allow access to own feed
      if (requestedUserId !== currentUserId) {
        throw new ConvexError("Unauthorized access to user feed");
      }
    }

    // Use the common query function
    return queryFeed(ctx, feedId, paginationOpts, filter);
  },
});

// Helper query to get user's personal feed
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

    // Use the common query function
    return queryFeed(ctx, feedId, paginationOpts, filter);
  },
});

// Helper query to get user's personal feed with grouped similar events
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

    // Use the grouped query function
    return queryGroupedFeed(ctx, feedId, paginationOpts, filter);
  },
});

// Helper query to get followed lists feed
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

    // Use the common query function
    return queryFeed(ctx, feedId, paginationOpts, filter);
  },
});

// Helper query to get followed users feed (events from users you follow)
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

    // Use the common query function
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

// Helper query to get a user's public feed (when publicListEnabled is true)
// Uses the visibility index to filter at database level BEFORE pagination
export const getPublicUserFeed = query({
  args: {
    username: v.string(),
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
  },
  handler: async (ctx, { username, paginationOpts, filter = "upcoming" }) => {
    // Get the user by username
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

    // Filter visibility at index level BEFORE pagination
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

    // Map feed entries to full events with users and eventFollows
    const events = await Promise.all(
      feedResults.page.map((entry) => getEventById(ctx, entry.eventId)),
    );

    return { ...feedResults, page: events.filter((e) => e !== null) };
  },
});

/**
 * Bound the scan for "last updated" — we only need the max `addedAt` across a
 * recent window per bucket, not every historical feed entry.
 */
const PUBLIC_FEED_LAST_UPDATED_TAKE = 100;

async function sampleMaxAddedAt(
  ctx: QueryCtx,
  feedId: string,
  hasEnded: boolean,
): Promise<number> {
  const rows = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_visibility_hasEnded_startTime", (q) =>
      q
        .eq("feedId", feedId)
        .eq("eventVisibility", "public")
        .eq("hasEnded", hasEnded),
    )
    .order("desc")
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

// Internal mutation to update hasEndedFlags for a batch of userFeeds entries
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

    // Get a single batch with the provided cursor
    const result = await ctx.db
      .query("userFeeds")
      .order("asc")
      .paginate({ numItems: batchSize, cursor });

    // Process each entry in the batch
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

// Internal query to get discover feed events without pagination (for external integrations)
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

    // Filter out null events and return valid events
    return events.filter((event) => event !== null);
  },
});

// Internal action to orchestrate updating hasEnded flags across all userFeeds
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

    // Process batches until no more data
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

// Internal mutation to update hasEndedFlags for a batch of userFeedGroups entries
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

    // Get a single batch with the provided cursor
    const result = await ctx.db
      .query("userFeedGroups")
      .order("asc")
      .paginate({ numItems: batchSize, cursor });

    // Process each entry in the batch
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

// Internal action to orchestrate updating hasEnded flags across all userFeedGroups
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

    // Process batches until no more data
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
