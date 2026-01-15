import type { MutationCtx, QueryCtx } from "./_generated/server";
import { selectPrimaryEventForFeed } from "./model/similarityHelpers";

type DbCtx = Pick<QueryCtx | MutationCtx, "db">;

type GroupKey = {
  feedId: string;
  similarityGroupId: string;
};

export async function upsertGroupedFeedEntryFromMembership(
  ctx: DbCtx,
  { feedId, similarityGroupId }: GroupKey,
): Promise<void> {
  const membership = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_group", (q) =>
      q.eq("feedId", feedId).eq("similarityGroupId", similarityGroupId),
    )
    .collect();

  if (membership.length === 0) {
    const existingGroup = await ctx.db
      .query("userFeedGroups")
      .withIndex("by_feed_group", (q) =>
        q.eq("feedId", feedId).eq("similarityGroupId", similarityGroupId),
      )
      .first();

    if (existingGroup) {
      await ctx.db.delete(existingGroup._id);
    }
    return;
  }

  const primaryEvent = await selectPrimaryEventForFeed(ctx, {
    feedId,
    similarityGroupId,
  });

  if (!primaryEvent) {
    const existingGroup = await ctx.db
      .query("userFeedGroups")
      .withIndex("by_feed_group", (q) =>
        q.eq("feedId", feedId).eq("similarityGroupId", similarityGroupId),
      )
      .first();

    if (existingGroup) {
      await ctx.db.delete(existingGroup._id);
    }
    return;
  }

  const eventStartTime = new Date(primaryEvent.startDateTime).getTime();
  const eventEndTime = new Date(primaryEvent.endDateTime).getTime();
  const hasEnded = eventEndTime < Date.now();
  const similarEventsCount = Math.max(0, membership.length - 1);

  const existingGroup = await ctx.db
    .query("userFeedGroups")
    .withIndex("by_feed_group", (q) =>
      q.eq("feedId", feedId).eq("similarityGroupId", similarityGroupId),
    )
    .first();

  const groupedDoc = {
    feedId,
    similarityGroupId,
    primaryEventId: primaryEvent.id,
    eventStartTime,
    eventEndTime,
    hasEnded,
    similarEventsCount,
  };

  if (!existingGroup) {
    await ctx.db.insert("userFeedGroups", groupedDoc);
  } else {
    await ctx.db.patch(existingGroup._id, groupedDoc);
  }
}

export async function removeGroupedFeedEntryIfNoMembers(
  ctx: DbCtx,
  { feedId, similarityGroupId }: GroupKey,
): Promise<void> {
  const membership = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_group", (q) =>
      q.eq("feedId", feedId).eq("similarityGroupId", similarityGroupId),
    )
    .collect();

  if (membership.length > 0) {
    return;
  }

  const existingGroup = await ctx.db
    .query("userFeedGroups")
    .withIndex("by_feed_group", (q) =>
      q.eq("feedId", feedId).eq("similarityGroupId", similarityGroupId),
    )
    .first();

  if (existingGroup) {
    await ctx.db.delete(existingGroup._id);
  }
}

export async function syncGroupedFeedEntriesForEvent(
  ctx: DbCtx,
  { eventId }: { eventId: string },
): Promise<void> {
  const feedEntries = await ctx.db
    .query("userFeeds")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const groups = new Map<string, GroupKey>();
  for (const entry of feedEntries) {
    if (!entry.similarityGroupId) {
      continue;
    }

    const key = `${entry.feedId}:${entry.similarityGroupId}`;
    if (!groups.has(key)) {
      groups.set(key, {
        feedId: entry.feedId,
        similarityGroupId: entry.similarityGroupId,
      });
    }
  }

  for (const group of groups.values()) {
    await upsertGroupedFeedEntryFromMembership(ctx, group);
  }
}
