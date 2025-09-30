/**
 * Aggregate definitions for efficient stats calculations
 *
 * This eliminates the need to fetch all user events and follows,
 * providing O(log(n)) lookups instead of O(n).
 */

import { TableAggregate } from "@convex-dev/aggregate";

import type { DataModel } from "./_generated/dataModel";
import { components } from "./_generated/api";

/**
 * Aggregate for events by creation time
 * Used for: capturesThisWeek, allTimeEvents count
 * Namespace: userId - separate data per user
 * SortKey: created_at timestamp
 */
export const eventsByCreation = new TableAggregate<{
  Namespace: string; // userId
  Key: number; // created_at timestamp in ms
  DataModel: DataModel;
  TableName: "events";
}>(components.eventsByCreation, {
  namespace: (doc) => doc.userId,
  sortKey: (doc) => new Date(doc.created_at).getTime(),
});

/**
 * Aggregate for events by start time
 * Used for: upcomingEvents count
 * Namespace: userId - separate data per user
 * SortKey: startDateTime timestamp
 */
export const eventsByStartTime = new TableAggregate<{
  Namespace: string; // userId
  Key: number; // startDateTime timestamp in ms
  DataModel: DataModel;
  TableName: "events";
}>(components.eventsByStartTime, {
  namespace: (doc) => doc.userId,
  sortKey: (doc) => new Date(doc.startDateTime).getTime(),
});

/**
 * Aggregate for event follows
 * Used for: total follows count, upcoming followed events
 * Namespace: userId - separate data per user
 * SortKey: null (we only need counts)
 */
export const eventFollowsAggregate = new TableAggregate<{
  Namespace: string; // userId
  Key: null;
  DataModel: DataModel;
  TableName: "eventFollows";
}>(components.eventFollowsAggregate, {
  namespace: (doc) => doc.userId,
  sortKey: () => null,
});

/**
 * Aggregate for user feeds
 * Used for: counting upcoming/past events in a user's feed (own + followed)
 * Namespace: feedId - separate data per feed (user_${userId}, discover, etc.)
 * SortKey: hasEnded flag (0 for upcoming/false, 1 for past/true)
 */
export const userFeedsAggregate = new TableAggregate<{
  Namespace: string; // feedId (e.g., "user_${userId}")
  Key: number; // hasEnded flag as number (0 or 1)
  DataModel: DataModel;
  TableName: "userFeeds";
}>(components.userFeedsAggregate, {
  namespace: (doc) => doc.feedId,
  sortKey: (doc) => (doc.hasEnded ? 1 : 0),
});
