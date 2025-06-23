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
  addedAt: number,         // When added to feed (timestamp)
}
```

### Feed Types

- **Personal feeds**: `user_${userId}` - Shows user's own events + followed events
- **Discover feed**: `discover` - Shows all public events
- **Future feeds**: `curated_${topic}`, `custom_${userId}_${name}` - Extensible design

## Usage

### Reading Feeds

```typescript
import { api } from "@soonlist/backend/convex/_generated/api";
import { usePaginatedQuery } from "convex/react";

// Get user's personal feed (includes followed events)
const { results, status } = usePaginatedQuery(
  api.feeds.getMyFeed,
  {},
  { initialNumItems: 50 },
);

// Get discover feed
const { results, status } = usePaginatedQuery(
  api.feeds.getDiscoverFeed,
  {},
  { initialNumItems: 50 },
);

// Get user's created events only (for public profiles)
const { results, status } = usePaginatedQuery(
  api.feeds.getUserCreatedEvents,
  { userId: "user_123" },
  { initialNumItems: 50 },
);
```

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
4. **Cron Jobs** - Update feeds in PlanetScale sync if events are created externally

## Benefits

- ✅ Stable pagination (no cursor invalidation)
- ✅ Better performance (pre-computed feeds)
- ✅ Deduplication handled at API level
- ✅ Extensible for future feed types
- ✅ Simple client-side implementation
