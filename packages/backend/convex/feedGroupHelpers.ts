import { v } from "convex/values";

import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import {
  getGroupMemberCount,
  selectPrimaryEventForFeed,
} from "./model/similarityHelpers";

export async function upsertGroupedFeedEntryFromMembershipInternal(
  ctx: MutationCtx,
  args: { feedId: string; similarityGroupId: string },
): Promise<void> {
  const { feedId, similarityGroupId } = args;

  const memberCount = await getGroupMemberCount(ctx, {
    feedId,
    similarityGroupId,
  });

  if (memberCount === 0) {
    await removeGroupedFeedEntryIfNoMembersInternal(ctx, {
      feedId,
      similarityGroupId,
    });
    return;
  }

  const primaryEvent = await selectPrimaryEventForFeed(ctx, {
    feedId,
    similarityGroupId,
  });

  if (!primaryEvent) {
    await removeGroupedFeedEntryIfNoMembersInternal(ctx, {
      feedId,
      similarityGroupId,
    });
    return;
  }

  const membershipEntries = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_group", (q) =>
      q.eq("feedId", feedId).eq("similarityGroupId", similarityGroupId),
    )
    .collect();

  const minAddedAt = Math.min(...membershipEntries.map((e) => e.addedAt));

  const eventStartTime = new Date(primaryEvent.startDateTime).getTime();
  const eventEndTime = new Date(primaryEvent.endDateTime).getTime();
  const currentTime = Date.now();
  const hasEnded = eventEndTime < currentTime;
  const similarEventsCount = Math.max(0, memberCount - 1);

  const existingEntry = await ctx.db
    .query("userFeedGroups")
    .withIndex("by_feed_group", (q) =>
      q.eq("feedId", feedId).eq("similarityGroupId", similarityGroupId),
    )
    .first();

  if (existingEntry) {
    await ctx.db.patch(existingEntry._id, {
      primaryEventId: primaryEvent.id,
      eventStartTime,
      eventEndTime,
      addedAt: minAddedAt,
      hasEnded,
      similarEventsCount,
    });
  } else {
    await ctx.db.insert("userFeedGroups", {
      feedId,
      similarityGroupId,
      primaryEventId: primaryEvent.id,
      eventStartTime,
      eventEndTime,
      addedAt: minAddedAt,
      hasEnded,
      similarEventsCount,
    });
  }
}

export async function removeGroupedFeedEntryIfNoMembersInternal(
  ctx: MutationCtx,
  args: { feedId: string; similarityGroupId: string },
): Promise<void> {
  const { feedId, similarityGroupId } = args;

  const existingEntry = await ctx.db
    .query("userFeedGroups")
    .withIndex("by_feed_group", (q) =>
      q.eq("feedId", feedId).eq("similarityGroupId", similarityGroupId),
    )
    .first();

  if (existingEntry) {
    await ctx.db.delete(existingEntry._id);
  }
}

export async function syncGroupedFeedEntriesForEventInternal(
  ctx: MutationCtx,
  args: { eventId: string; similarityGroupId: string },
): Promise<void> {
  const { eventId, similarityGroupId } = args;

  const feedEntries = await ctx.db
    .query("userFeeds")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const feedGroupPairs = new Set<string>();

  for (const entry of feedEntries) {
    if (entry.similarityGroupId === similarityGroupId) {
      feedGroupPairs.add(`${entry.feedId}:${entry.similarityGroupId}`);
    }
  }

  const affectedGroups = await ctx.db
    .query("userFeedGroups")
    .withIndex("by_group", (q) => q.eq("similarityGroupId", similarityGroupId))
    .collect();

  for (const group of affectedGroups) {
    feedGroupPairs.add(`${group.feedId}:${group.similarityGroupId}`);
  }

  for (const pair of feedGroupPairs) {
    const [feedId, groupId] = pair.split(":");
    if (feedId && groupId) {
      await upsertGroupedFeedEntryFromMembershipInternal(ctx, {
        feedId,
        similarityGroupId: groupId,
      });
    }
  }
}

export const upsertGroupedFeedEntry = internalMutation({
  args: {
    feedId: v.string(),
    similarityGroupId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await upsertGroupedFeedEntryFromMembershipInternal(ctx, args);
  },
});

export const removeGroupedFeedEntryIfNoMembers = internalMutation({
  args: {
    feedId: v.string(),
    similarityGroupId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await removeGroupedFeedEntryIfNoMembersInternal(ctx, args);
  },
});

export const syncGroupedFeedEntriesForEvent = internalMutation({
  args: {
    eventId: v.string(),
    similarityGroupId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await syncGroupedFeedEntriesForEventInternal(ctx, args);
  },
});
