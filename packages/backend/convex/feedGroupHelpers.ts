import { v } from "convex/values";

import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import {
  getGroupMemberCount,
  selectPrimaryEventForFeed,
} from "./model/similarityHelpers";

/**
 * Upsert a grouped feed entry from userFeeds membership
 * This derives the userFeedGroups entry from the source of truth (userFeeds)
 */
export async function upsertGroupedFeedEntryFromMembershipInternal(
  ctx: MutationCtx,
  args: { feedId: string; similarityGroupId: string },
): Promise<void> {
  const { feedId, similarityGroupId } = args;

  // Get member count from userFeeds
  const memberCount = await getGroupMemberCount(ctx, {
    feedId,
    similarityGroupId,
  });

  // If no members, remove the grouped entry
  if (memberCount === 0) {
    await removeGroupedFeedEntryIfNoMembersInternal(ctx, {
      feedId,
      similarityGroupId,
    });
    return;
  }

  // Select primary event for this feed+group
  const primaryEvent = await selectPrimaryEventForFeed(ctx, {
    feedId,
    similarityGroupId,
  });

  if (!primaryEvent) {
    // No valid events in the group, remove the entry
    await removeGroupedFeedEntryIfNoMembersInternal(ctx, {
      feedId,
      similarityGroupId,
    });
    return;
  }

  // Get the min addedAt from membership entries for stable ordering
  const membershipEntries = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_group", (q) =>
      q.eq("feedId", feedId).eq("similarityGroupId", similarityGroupId),
    )
    .collect();

  const minAddedAt = Math.min(...membershipEntries.map((e) => e.addedAt));

  // Calculate times from primary event
  const eventStartTime = new Date(primaryEvent.startDateTime).getTime();
  const eventEndTime = new Date(primaryEvent.endDateTime).getTime();
  const currentTime = Date.now();
  const hasEnded = eventEndTime < currentTime;
  const similarEventsCount = Math.max(0, memberCount - 1);

  // Check if entry already exists
  const existingEntry = await ctx.db
    .query("userFeedGroups")
    .withIndex("by_feed_group", (q) =>
      q.eq("feedId", feedId).eq("similarityGroupId", similarityGroupId),
    )
    .first();

  if (existingEntry) {
    // Update existing entry
    await ctx.db.patch(existingEntry._id, {
      primaryEventId: primaryEvent.id,
      eventStartTime,
      eventEndTime,
      addedAt: minAddedAt,
      hasEnded,
      similarEventsCount,
    });
  } else {
    // Insert new entry
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

/**
 * Remove a grouped feed entry if no members remain
 */
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

/**
 * Sync all grouped feed entries for an event
 * Call this when an event's userFeeds entries change
 */
export async function syncGroupedFeedEntriesForEventInternal(
  ctx: MutationCtx,
  args: { eventId: string; similarityGroupId: string },
): Promise<void> {
  const { eventId, similarityGroupId } = args;

  // Find all userFeeds entries for this event
  const feedEntries = await ctx.db
    .query("userFeeds")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  // Get unique (feedId, similarityGroupId) pairs
  const feedGroupPairs = new Set<string>();

  for (const entry of feedEntries) {
    if (entry.similarityGroupId === similarityGroupId) {
      feedGroupPairs.add(`${entry.feedId}:${entry.similarityGroupId}`);
    }
  }

  // Also need to check if this event was the primary for any feed groups
  // and update those groups (in case the primary needs to change)
  const affectedGroups = await ctx.db
    .query("userFeedGroups")
    .withIndex("by_group", (q) => q.eq("similarityGroupId", similarityGroupId))
    .collect();

  for (const group of affectedGroups) {
    feedGroupPairs.add(`${group.feedId}:${group.similarityGroupId}`);
  }

  // Update each affected feed+group
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

// Exposed internal mutations for calling from other modules

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
