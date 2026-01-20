# Fix publicListEnabled Event Visibility

## Summary

When `publicListEnabled` is toggled, it should bulk update all user events to match the setting. New events should also respect this setting. The profile page should show the user's feed (created + saved events) filtered to only public events.

## Critical Fix: Pagination Bug

**Issue:** The profile page needs to show all events in a user's feed (created + saved), but filtered to only public events. The `userFeeds` table doesn't have visibility info, so filtering after pagination breaks pagination.

**Solution:** Add `eventVisibility` field to the `userFeeds` table with a new index, enabling filtering at the database level BEFORE pagination.

---

## Changes

### 1. Schema: Add `eventVisibility` to `userFeeds` Table

**File:** `packages/backend/convex/schema.ts` (around line 207)

```typescript
userFeeds: defineTable({
  feedId: v.string(),
  eventId: v.string(),
  eventStartTime: v.number(),
  eventEndTime: v.number(),
  addedAt: v.number(),
  hasEnded: v.boolean(),
  beforeThisDateTime: v.optional(v.string()),
  similarityGroupId: v.optional(v.string()),
  // NEW: Store event visibility for efficient filtering
  eventVisibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
})
  .index("by_feed_hasEnded_startTime", ["feedId", "hasEnded", "eventStartTime"])
  .index("by_feed_event", ["feedId", "eventId"])
  .index("by_event", ["eventId"])
  .index("by_feed_group", ["feedId", "similarityGroupId"])
  // NEW: Index for filtering by visibility before pagination
  .index("by_feed_visibility_hasEnded_startTime", [
    "feedId",
    "eventVisibility",
    "hasEnded",
    "eventStartTime",
  ]),
```

**Note:** `eventVisibility` is optional for backward compatibility with existing entries. New entries will always have it set.

---

### 2. Update `upsertFeedEntry` to Include Visibility

**File:** `packages/backend/convex/feedHelpers.ts` (around line 314)

Update the function signature and implementation:

```typescript
async function upsertFeedEntry(
  ctx: MutationCtx,
  feedId: string,
  eventId: string,
  eventStartTime: number,
  eventEndTime: number,
  addedAt: number,
  similarityGroupId?: string,
  eventVisibility?: "public" | "private",  // NEW parameter
): Promise<void> {
  const existingEntry = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_event", (q) =>
      q.eq("feedId", feedId).eq("eventId", eventId),
    )
    .first();

  const currentTime = Date.now();
  const hasEnded = eventEndTime < currentTime;

  if (!existingEntry) {
    const doc = {
      feedId,
      eventId,
      eventStartTime,
      eventEndTime,
      addedAt,
      hasEnded,
      similarityGroupId,
      eventVisibility,  // NEW field
    };
    const id = await ctx.db.insert("userFeeds", doc);
    const insertedDoc = (await ctx.db.get(id))!;
    await userFeedsAggregate.replaceOrInsert(ctx, insertedDoc, insertedDoc);
    // ... rest of grouped feed logic
  } else {
    // Update existing entry with new visibility if provided
    const oldDoc = existingEntry;
    const updates: Record<string, unknown> = {
      eventStartTime,
      eventEndTime,
      hasEnded,
    };
    if (eventVisibility !== undefined) {
      updates.eventVisibility = eventVisibility;
    }
    if (similarityGroupId !== undefined) {
      updates.similarityGroupId = similarityGroupId;
    }
    await ctx.db.patch(existingEntry._id, updates);
    // ... rest of update logic
  }
}
```

---

### 3. Update `updateEventInFeeds` to Pass Visibility

**File:** `packages/backend/convex/feedHelpers.ts` (around line 51)

Update all calls to `upsertFeedEntry` to include visibility:

```typescript
// 1. Creator's personal feed - include visibility
await upsertFeedEntry(
  ctx,
  creatorFeedId,
  eventId,
  eventStartTime,
  eventEndTime,
  currentTime,
  similarityGroupId,
  visibility,  // NEW: pass visibility
);

// 2. Discover feed - always public (only added if visibility is public)
if (visibility === "public" && userShowDiscover) {
  await upsertFeedEntry(
    ctx,
    discoverFeedId,
    eventId,
    eventStartTime,
    eventEndTime,
    currentTime,
    similarityGroupId,
    "public",  // Always public for discover
  );
}

// 3. Event followers' feeds - inherit event visibility
for (const follow of eventFollows) {
  const followerFeedId = `user_${follow.userId}`;
  await upsertFeedEntry(
    ctx,
    followerFeedId,
    eventId,
    eventStartTime,
    eventEndTime,
    currentTime,
    similarityGroupId,
    visibility,  // NEW: pass visibility
  );
}
```

---

### 4. Update `addEventToUserFeed` to Include Visibility

**File:** `packages/backend/convex/feedHelpers.ts` (around line 147)

```typescript
if (!existing) {
  const doc = {
    feedId,
    eventId,
    eventStartTime,
    eventEndTime,
    addedAt: currentTime,
    hasEnded: eventEndTime < currentTime,
    similarityGroupId,
    eventVisibility: event.visibility,  // NEW: include visibility from event
  };
  const id = await ctx.db.insert("userFeeds", doc);
  // ...
}
```

---

### 5. Add Mutation to Update Visibility in All Feed Entries

**File:** `packages/backend/convex/feedHelpers.ts`

Add new internal mutation:

```typescript
// Helper to update visibility for all feed entries of an event
export const updateEventVisibilityInFeeds = internalMutation({
  args: {
    eventId: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  handler: async (ctx, { eventId, visibility }) => {
    const feedEntries = await ctx.db
      .query("userFeeds")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    for (const entry of feedEntries) {
      if (entry.eventVisibility !== visibility) {
        const oldDoc = entry;
        await ctx.db.patch(entry._id, { eventVisibility: visibility });
        const updatedDoc = (await ctx.db.get(entry._id))!;
        await userFeedsAggregate.replaceOrInsert(ctx, oldDoc, updatedDoc);
      }
    }
  },
});
```

---

### 6. Create New Query: `getPublicUserFeed`

**File:** `packages/backend/convex/feeds.ts`

Replace/update the existing `getPublicUserFeed` to use the new index:

```typescript
// Query to get a user's public feed (only public events)
// Uses the new visibility index for correct pagination
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

    // Use the new index with visibility filter BEFORE pagination
    const feedQuery = ctx.db
      .query("userFeeds")
      .withIndex("by_feed_visibility_hasEnded_startTime", (q) =>
        q.eq("feedId", feedId).eq("eventVisibility", "public").eq("hasEnded", hasEnded),
      )
      .order(order);

    // Paginate AFTER visibility filter is applied
    const feedResults = await feedQuery.paginate(paginationOpts);

    // Enrich with full event data
    const events = await Promise.all(
      feedResults.page.map(async (feedEntry) => {
        return await getEventById(ctx, feedEntry.eventId);
      }),
    );

    const validEvents = events.filter((event) => event !== null);

    return {
      ...feedResults,
      page: validEvents,
    };
  },
});
```

---

### 7. Update Profile Page to Use `getPublicUserFeed`

**File:** `apps/expo/src/app/[username]/index.tsx` (around line 51)

```typescript
// Change from getUserCreatedEvents to getPublicUserFeed
const {
  results: events,
  status,
  loadMore,
} = useStablePaginatedQuery(
  api.feeds.getPublicUserFeed,
  targetUser
    ? {
        username: targetUser.username,
        filter: "upcoming" as const,
      }
    : "skip",
  { initialNumItems: 50 },
);
```

Also remove the client-side visibility filter (lines 61-62) since filtering now happens at database level.

---

### 8. Bulk Update Events When publicListEnabled Changes

**File:** `packages/backend/convex/users.ts`

```typescript
export const bulkUpdateEventVisibility = internalMutation({
  args: {
    userId: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  handler: async (ctx, { userId, visibility }) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const event of events) {
      if (event.visibility === visibility) continue;

      // Update event visibility
      await ctx.db.patch(event._id, {
        visibility,
        updatedAt: new Date().toISOString(),
      });

      // Update visibility in all feed entries
      await ctx.runMutation(internal.feedHelpers.updateEventVisibilityInFeeds, {
        eventId: event.id,
        visibility,
      });

      // Handle feed membership changes
      if (visibility === "private") {
        await ctx.runMutation(internal.feedHelpers.removeEventFromFeeds, {
          eventId: event.id,
          keepCreatorFeed: true,
        });
      } else {
        await ctx.runMutation(internal.feedHelpers.updateEventInFeeds, {
          eventId: event.id,
          userId: event.userId,
          visibility,
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          similarityGroupId: event.similarityGroupId,
        });
      }
    }
  },
});
```

**In `updatePublicListSettings` handler:**

```typescript
// After patching user, bulk update events if publicListEnabled changed
if (args.publicListEnabled !== undefined &&
    args.publicListEnabled !== user.publicListEnabled) {
  await ctx.runMutation(internal.users.bulkUpdateEventVisibility, {
    userId: args.userId,
    visibility: args.publicListEnabled ? "public" : "private",
  });
}
```

---

### 9. New Events Respect User's publicListEnabled Setting

**File:** `packages/backend/convex/model/events.ts` (around line 750)

```typescript
// Before the ctx.db.insert call, determine effective visibility
let effectiveVisibility = visibility;
if (effectiveVisibility === undefined) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_custom_id", (q) => q.eq("id", userId))
    .first();
  effectiveVisibility = user?.publicListEnabled ? "public" : "private";
}

// Use effectiveVisibility in the insert
const eventDocId = await ctx.db.insert("events", {
  // ... other fields
  visibility: effectiveVisibility,
  // ...
});
```

---

### 10. Backfill Migration (One-time)

Create a migration to backfill `eventVisibility` for existing `userFeeds` entries:

**File:** `packages/backend/convex/migrations/backfillUserFeedVisibility.ts` (new file)

```typescript
import { internalMutation, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const backfillBatch = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    batchSize: v.number(),
  },
  handler: async (ctx, { cursor, batchSize }) => {
    const result = await ctx.db
      .query("userFeeds")
      .order("asc")
      .paginate({ numItems: batchSize, cursor });

    let updated = 0;
    for (const entry of result.page) {
      // Skip if already has visibility
      if (entry.eventVisibility !== undefined) continue;

      // Look up event to get visibility
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", entry.eventId))
        .first();

      if (event) {
        await ctx.db.patch(entry._id, {
          eventVisibility: event.visibility,
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

export const backfillAll = internalAction({
  handler: async (ctx) => {
    let cursor: string | null = null;
    let totalProcessed = 0;
    let totalUpdated = 0;

    while (true) {
      const result = await ctx.runMutation(internal.migrations.backfillUserFeedVisibility.backfillBatch, {
        cursor,
        batchSize: 500,
      });

      totalProcessed += result.processed;
      totalUpdated += result.updated;

      if (result.isDone) break;
      cursor = result.nextCursor;
    }

    console.log(`Backfill complete: ${totalUpdated} updated out of ${totalProcessed} processed`);
    return { totalProcessed, totalUpdated };
  },
});
```

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/backend/convex/schema.ts` | Add `eventVisibility` field and new index to `userFeeds` |
| `packages/backend/convex/feedHelpers.ts` | Update `upsertFeedEntry`, `addEventToUserFeed`, add `updateEventVisibilityInFeeds` |
| `packages/backend/convex/feeds.ts` | Update `getPublicUserFeed` to use new visibility index |
| `packages/backend/convex/users.ts` | Add `bulkUpdateEventVisibility`, update `updatePublicListSettings` |
| `packages/backend/convex/model/events.ts` | Update `createEvent` to respect `publicListEnabled` |
| `apps/expo/src/app/[username]/index.tsx` | Change to use `getPublicUserFeed`, remove client-side filter |
| `packages/backend/convex/migrations/backfillUserFeedVisibility.ts` | NEW: One-time backfill migration |

---

## Why This Approach Works

### Pagination Correctness
- **Problem:** `userFeeds` had no visibility field, so filtering happened after pagination
- **Solution:** Add `eventVisibility` to `userFeeds` with an index
- **Result:** Index filters `eventVisibility="public"` BEFORE pagination

### Query Efficiency
- New index `by_feed_visibility_hasEnded_startTime` allows efficient queries:
  - `feedId` = user's feed
  - `eventVisibility` = "public"
  - `hasEnded` = false (upcoming) or true (past)
  - Sorted by `eventStartTime`

### Data Consistency
- Visibility stored in both `events` (source of truth) and `userFeeds` (denormalized for queries)
- When event visibility changes, update both tables
- Backfill migration handles existing data

---

## Verification

1. **Run backfill migration** after deploying schema changes

2. **Test pagination correctness:**
   - User with 100 events in feed (50 public, 50 private)
   - Request page size of 10
   - Should receive exactly 10 public events per page
   - Cursor correctly points to next batch of public events

3. **Test profile shows full feed:**
   - User has events they created AND events they saved from others
   - Profile shows both types (filtered to public only)

4. **Test publicListEnabled toggle ON:**
   - Enable `publicListEnabled` → all user's events become public
   - Feed entries updated with `eventVisibility: "public"`
   - Profile page shows all events

5. **Test publicListEnabled toggle OFF:**
   - Disable `publicListEnabled` → all user's events become private
   - Feed entries updated with `eventVisibility: "private"`
   - Profile page shows empty (or only saved public events from others)

6. **Test new event creation:**
   - User with `publicListEnabled: true` creates event → should be public
   - User with `publicListEnabled: false` creates event → should be private

7. **Run type checks:**
   ```bash
   pnpm check
   ```
