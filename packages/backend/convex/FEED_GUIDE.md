# Feed System Guide

## Overview

The feed system uses a pre-computed approach to solve pagination issues and improve performance. Events are stored in a `userFeeds` table and fetched with stable pagination.

## Architecture

### Feed Table Schema

```typescript
userFeeds: {
  feedId: string,          // Feed identifier (user_${userId}, discover, etc.)
  eventId: string,         // Event in the feed
  eventStartTime: number,  // For chronological ordering (timestamp)
  eventEndTime: number,    // For filtering ongoing/past events (timestamp)
  addedAt: number,         // When added to feed (timestamp)
  hasEnded: boolean,       // Required: true if event has ended, false if ongoing/upcoming
}
```

- The index `by_feed_hasEnded_startTime` (["feedId", "hasEnded", "eventStartTime"]) is used for efficient filtering and sorting.

### Feed Types

- **Personal feeds**: `user_${userId}` - Shows user's own events + followed events + events from followed lists
  - Events appear in personal feeds through a union of sources:
    - Events created by the user (always present)
    - Events directly followed by the user (via `eventFollows`)
    - Events in lists the user follows (via `listFollows`)
  - Removing one source (e.g., unfollowing an event) only removes the event if no other source still applies
- **Discover feed**: `discover` - Shows all public events
- **Future feeds**: `curated_${topic}`, `custom_${userId}_${name}` - Extensible design

## Usage

### Reading Feeds

```typescript
import { usePaginatedQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

// Get user's personal feed (includes followed events)
const { results, status } = usePaginatedQuery(
  api.feeds.getMyFeed,
  { filter: "upcoming" },
  { initialNumItems: 50 },
);

// Get discover feed
const { results, status } = usePaginatedQuery(
  api.feeds.getDiscoverFeed,
  { filter: "upcoming" },
  { initialNumItems: 50 },
);

// Get user's created events only (for public profiles)
const { results, status } = usePaginatedQuery(
  api.feeds.getUserCreatedEvents,
  { userId: "user_123" },
  { initialNumItems: 50 },
);
```

- Filtering is now done at the database level using the required `hasEnded` field and the new index. Pagination is consistent and efficient.

### Updating Feeds

When events are created/updated, use the feed helpers:

```typescript
import { internal } from "./_generated/api";

// In your event creation/update mutation
await ctx.runMutation(internal.feedHelpers.updateEventInFeeds, {
  eventId: event.id,
  userId: event.userId,
  visibility: event.visibility,
  startDateTime: event.startDateTime,
});

// When a user follows an event
await ctx.runMutation(internal.feedHelpers.addEventToUserFeed, {
  userId: currentUserId,
  eventId: eventId,
});

// When event visibility changes to private
await ctx.runMutation(internal.feedHelpers.removeEventFromFeeds, {
  eventId: eventId,
  keepCreatorFeed: true, // Keep in creator's feed
});
```

## Migration

Run the migration to populate existing events into feeds:

```bash
# From Convex dashboard or CLI
npx convex run migrations/populateUserFeeds:populateUserFeeds
```

## Integration Points

1. **Event Creation** - Add `updateEventInFeeds` call in event creation workflow
2. **Event Updates** - Update feeds when visibility or time changes
3. **Follow Actions** - Add `addEventToUserFeed` when user follows event
4. **Unfollow Actions** - When unfollowing an event, only remove from feed if event is not in any followed list and user is not the creator
5. **Cron Jobs** - Update feeds in PlanetScale sync if events are created externally

## Benefits

- ✅ Stable pagination (no cursor invalidation)
- ✅ Better performance (pre-computed feeds)
- ✅ Deduplication handled at API level
- ✅ Extensible for future feed types
- ✅ Simple client-side implementation
