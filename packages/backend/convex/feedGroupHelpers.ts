import type { MutationCtx } from "./_generated/server";
import { selectPrimaryEventForFeed } from "./model/similarityHelpers";

export async function upsertGroupedFeedEntryFromMembership(
  ctx: MutationCtx,
  args: { feedId: string; similarityGroupId: string },
) {
  const membership = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_group", (q) =>
      q.eq("feedId", args.feedId).eq("similarityGroupId", args.similarityGroupId),
    )
    .collect();

  if (membership.length === 0) {
    await removeGroupedFeedEntryIfNoMembers(ctx, args);
    return;
  }

  const primaryEvent = await selectPrimaryEventForFeed(ctx, args);
  if (!primaryEvent) {
    await removeGroupedFeedEntryIfNoMembers(ctx, args);
    return;
  }

  const eventStartTime = new Date(primaryEvent.startDateTime).getTime();
  const eventEndTime = new Date(primaryEvent.endDateTime).getTime();
  const hasEnded = eventEndTime < Date.now();
  const similarEventsCount = Math.max(0, membership.length - 1);

  const existing = await ctx.db
    .query("userFeedGroups")
    .withIndex("by_feed_group", (q) =>
      q.eq("feedId", args.feedId).eq("similarityGroupId", args.similarityGroupId),
    )
    .first();

  const nextDoc = {
    feedId: args.feedId,
    similarityGroupId: args.similarityGroupId,
    primaryEventId: primaryEvent.id,
    eventStartTime,
    eventEndTime,
    hasEnded,
    similarEventsCount,
  };

  if (!existing) {
    await ctx.db.insert("userFeedGroups", nextDoc);
  } else {
    await ctx.db.patch(existing._id, nextDoc);
  }
}

export async function removeGroupedFeedEntryIfNoMembers(
  ctx: MutationCtx,
  args: { feedId: string; similarityGroupId: string },
) {
  const membership = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_group", (q) =>
      q.eq("feedId", args.feedId).eq("similarityGroupId", args.similarityGroupId),
    )
    .collect();

  if (membership.length > 0) {
    return;
  }

  const existing = await ctx.db
    .query("userFeedGroups")
    .withIndex("by_feed_group", (q) =>
      q.eq("feedId", args.feedId).eq("similarityGroupId", args.similarityGroupId),
    )
    .first();

  if (existing) {
    await ctx.db.delete(existing._id);
  }
}

export async function syncGroupedFeedEntriesForEvent(
  ctx: MutationCtx,
  args: { eventId: string },
) {
  const feedEntries = await ctx.db
    .query("userFeeds")
    .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
    .collect();

  const uniquePairs = new Map<string, { feedId: string; similarityGroupId: string }>();

  for (const entry of feedEntries) {
    if (!entry.similarityGroupId) {
      continue;
    }
    const key = `${entry.feedId}:${entry.similarityGroupId}`;
    uniquePairs.set(key, {
      feedId: entry.feedId,
      similarityGroupId: entry.similarityGroupId,
    });
  }

  for (const pair of uniquePairs.values()) {
    await upsertGroupedFeedEntryFromMembership(ctx, pair);
  }
}
