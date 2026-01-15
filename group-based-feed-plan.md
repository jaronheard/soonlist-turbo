# Group-Based Feed Entries Implementation Plan (Option B)

## Starting Point

This plan starts from `main` with a clean implementation and is designed to be **backwards compatible for existing clients**. Old clients keep using the existing feed queries (reading from `userFeeds`) without changes.

Updated clients will call only the new grouped query (no legacy fallback), so we must ship **backend + schema + migrations first**.

Key decision (updated):

- We **will touch legacy** in an additive way: add optional `similarityGroupId` to `userFeeds` and index it by `(feedId, similarityGroupId)`.
- `userFeeds` becomes the **membership source of truth** for grouped feeds, which avoids privacy/correctness bugs (primary selection and counts are computed from events that are actually in that feed).

## Problem Statement

The current client-side similarity calculation causes **UI stuttering** when rendering feeds. Each time the feed renders, the client runs O(n²) comparisons to group similar events, which blocks the main thread.

**Goals:**

1. **Eliminate client stuttering**: move similarity grouping + count computation to the server
2. **Maintain calendar-like UX**: each real-world event appears once in the feed
3. **Fix pagination edge case**: similar events won’t be split across pages
4. **Preserve privacy/correctness**: grouped feeds must respect the same per-feed inclusion rules as legacy feeds

## Solution Overview

We introduce a server-side notion of similarity groups:

- `events.similarityGroupId` identifies real-world duplicates.
- `userFeeds.similarityGroupId` stores group membership **per feed entry** (additive to legacy).
- New `userFeedGroups` stores **one row per `(feedId, similarityGroupId)`** for correct pagination and stable ordering.

**Why both `userFeeds` and `userFeedGroups`?**

- `userFeeds` is the membership source of truth (which events are in which feed) and is already maintained correctly by existing fanout logic.
- `userFeedGroups` is a _derived_, deduped table to solve pagination and eliminate client grouping.

Critically:

- **Legacy remains unchanged for clients**: existing queries (e.g. `getFeed`, `getMyFeed`, etc.) continue to read from `userFeeds` and return the same shape.
- **V2 is additive**: new query reads from `userFeedGroups` and returns events enriched with `similarEventsCount`.
- **Dual-write during rollout**: backend writes keep both `userFeeds.similarityGroupId` and `userFeedGroups` in sync.

---

## Phase 1: Schema Changes

### 1.1 Add `similarityGroupId` to Events

**File:** `packages/backend/convex/schema.ts`

Add an optional field (optional during migration, required after), plus an index to find all events in a group:

```typescript
events: defineTable({
  // ...existing fields...

  // NEW: Similarity group ID (set on creation; optional during migration)
  // Format: "sg_" + generatePublicId()
  similarityGroupId: v.optional(v.string()),
})
  // ...existing indexes...
  .index("by_similarity_group", ["similarityGroupId"]);
```

### 1.2 Add `similarityGroupId` to Legacy `userFeeds` (Option B)

**File:** `packages/backend/convex/schema.ts`

Add an optional field + a new index. Old queries ignore this field.

```typescript
userFeeds: defineTable({
  feedId: v.string(),
  eventId: v.string(),
  eventStartTime: v.number(),
  eventEndTime: v.number(),
  addedAt: v.number(),
  hasEnded: v.boolean(),
  beforeThisDateTime: v.optional(v.string()),

  // NEW (Option B): group membership for grouped feed derivation
  similarityGroupId: v.optional(v.string()),
})
  .index("by_feed_hasEnded_startTime", ["feedId", "hasEnded", "eventStartTime"])
  .index("by_feed_event", ["feedId", "eventId"])
  .index("by_event", ["eventId"])
  // NEW: lookup membership for a given feed+group
  .index("by_feed_group", ["feedId", "similarityGroupId"]);
```

### 1.3 Add `userFeedGroups` (Grouped Feed Table)

**File:** `packages/backend/convex/schema.ts`

This stores one entry per similarity group per feed (used for pagination and server-side grouping).

```typescript
userFeedGroups: defineTable({
  feedId: v.string(),
  similarityGroupId: v.string(),

  // Which specific event to display (event custom id string)
  primaryEventId: v.string(),

  // Same ordering/filtering shape as legacy feed entries
  eventStartTime: v.number(),
  eventEndTime: v.number(),
  addedAt: v.number(),
  hasEnded: v.boolean(),

  // NEW: server-computed, feed-scoped count (memberCount - 1)
  similarEventsCount: v.number(),
})
  .index("by_feed_hasEnded_startTime", ["feedId", "hasEnded", "eventStartTime"])
  .index("by_feed_group", ["feedId", "similarityGroupId"])
  .index("by_group", ["similarityGroupId"]);
```

---

## Phase 2: Similarity Helpers (Server-side)

### 2.1 Create Similarity Helper Module

**File:** `packages/backend/convex/model/similarityHelpers.ts` (NEW)

Port (or implement) similarity detection algorithms:

- `THRESHOLDS`:
  - time proximity threshold (±60 minutes)
  - text similarity threshold (e.g. 10%)
- `textToVector(text)`
- `cosineSimilarity(v1, v2)`
- `areEventsSimilar(e1, e2)`

Add new group utilities:

| Function                                     | Purpose                                                |
| -------------------------------------------- | ------------------------------------------------------ |
| `generateSimilarityGroupId()`                | `"sg_" + generatePublicId()`                           |
| `findSimilarityGroup(ctx, eventData)`        | Find an existing group among nearby events             |
| `findSimilarityGroupForBackfill(ctx, event)` | For migrations: use earlier events to establish groups |

### 2.2 Feed-Scoped Primary Selection (Critical Fix)

Because group membership is **per feed**, primary selection must only consider events _that are actually in that feed_.

Add a helper that uses `userFeeds` membership:

```typescript
export async function selectPrimaryEventForFeed(
  ctx: QueryCtx,
  args: { feedId: string; similarityGroupId: string },
): Promise<Doc<"events"> | null> {
  const membership = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_group", (q) =>
      q
        .eq("feedId", args.feedId)
        .eq("similarityGroupId", args.similarityGroupId),
    )
    .collect();

  const memberEvents = await Promise.all(
    membership.map((m) => getEventById(ctx, m.eventId)),
  );
  const valid = memberEvents.filter((e): e is Doc<"events"> => e !== null);
  if (valid.length === 0) return null;

  // Priority 1: If this is a user feed, prefer that user's own event in the group.
  const feedUserId = args.feedId.startsWith("user_")
    ? args.feedId.replace("user_", "")
    : null;
  if (feedUserId) {
    const own = valid.find((e) => e.userId === feedUserId);
    if (own) return own;
  }

  // Priority 2: earliest by created_at (deterministic)
  return valid.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0];
}
```

This avoids leaking a private/non-member event into a feed group.

---

## Phase 3: Feed Dual-Write (Legacy Membership + Grouped Derivation)

### 3.1 Update Legacy Feed Writers to Populate `userFeeds.similarityGroupId`

**File:** `packages/backend/convex/feedHelpers.ts`

Any code path that inserts/patches `userFeeds` must set `similarityGroupId` based on the underlying event.

Recommended approach:

- Extend internal helper signatures to accept an optional `similarityGroupId?: string` (additive).
- For call sites that already fetch the event (follow/list fanout), read `event.similarityGroupId` and pass it through.
- For `updateEventInFeeds`, which does not currently fetch the event, pass `similarityGroupId` from the event lifecycle (create/update/toggle) where it is known.

Call sites to cover (existing in this repo):

- `model/events.ts`: `createEvent`, `updateEvent`, `toggleEventVisibility`
- `planetscaleSync.ts`: when backfilling/fanning out feeds from sync
- follow/unfollow path: `addEventToUserFeed` already fetches the event
- list fanout paths: `addEventToListFollowersFeeds`, `addListEventsToUserFeed`, etc. already fetch events
- followed-users fanout paths: `addUserEventsToUserFeed` fetches events

### 3.2 New Grouped Feed Helper Module (Derived Table Maintenance)

**File:** `packages/backend/convex/feedGroupHelpers.ts` (NEW)

Core primitive:

- `upsertGroupedFeedEntryFromMembership(ctx, { feedId, similarityGroupId })`
  - reads membership from `userFeeds` via `by_feed_group`
  - elects `primaryEventId` via `selectPrimaryEventForFeed`
  - computes `similarEventsCount = max(0, memberCount - 1)`
  - chooses stable `addedAt` (recommended: **min** of member `addedAt` so adding another similar event doesn’t reorder the feed)
  - sets times/hasEnded from the primary event
  - inserts/patches `userFeedGroups`

And:

- `removeGroupedFeedEntryIfNoMembers(ctx, { feedId, similarityGroupId })`
- `syncGroupedFeedEntriesForEvent(ctx, { eventId })`:
  - find all `userFeeds` entries for `eventId` (existing index `by_event`)
  - for each `(feedId, similarityGroupId)` pair, call `upsertGroupedFeedEntryFromMembership`

### 3.3 When to Call Grouped Upserts

Any time we change `userFeeds` membership for an event, we must update grouped entries for the affected feed+group.

Practical pattern:

- After inserting/updating a `userFeeds` entry (or deleting it), call `upsertGroupedFeedEntryFromMembership` (or `removeGroupedFeedEntryIfNoMembers`) for the corresponding `(feedId, similarityGroupId)`.

This keeps `userFeedGroups` derived and consistent without scanning global `events` groups.

---

## Phase 4: Event Lifecycle Updates (Similarity + Feed Writes)

### 4.1 `createEvent`

**File:** `packages/backend/convex/model/events.ts`

1. Find or create group:

- Use a time-window candidate search (there is already an indexed helper pattern via `events.by_startDateTime` in this repo).
- If a similar event exists and has `similarityGroupId`, reuse it.
- Else generate a new `similarityGroupId`.

2. Insert event with `similarityGroupId`.
3. Call existing legacy feed fanout, but include `similarityGroupId` so `userFeeds` stores membership.
4. Grouped table derives from `userFeeds` writes (Phase 3).

### 4.2 `updateEvent`

**File:** `packages/backend/convex/model/events.ts`

Baseline behavior (recommended for first rollout):

- Treat `events.similarityGroupId` as **immutable** for simplicity and determinism.
- When name/description/location/time changes, do not attempt to regroup; keep the original group.

If you want regrouping later, add it as a separate hardening phase because it requires:

- patching `events.similarityGroupId`
- patching `userFeeds.similarityGroupId` for all feed entries for that event (by `userFeeds.by_event`)
- upserting old + new grouped entries per impacted feed

### 4.3 `deleteEvent`

**File:** `packages/backend/convex/model/events.ts`

When deleting:

- Before deleting `userFeeds` entries (or as part of the removal helper), capture the affected `(feedId, similarityGroupId)` pairs so you can:
  - remove grouped entries if the group is now empty in that feed
  - otherwise re-elect primary and update counts

---

## Phase 5: Feed Query Updates (V2)

### 5.1 Keep Legacy Queries Untouched

**File:** `packages/backend/convex/feeds.ts`

No changes required for old clients.

### 5.2 Add Grouped Feed Query

**File:** `packages/backend/convex/feeds.ts`

Add a new query that reads from `userFeedGroups` (not `userFeeds`) and returns enriched events.

Key requirements:

- apply the same auth restrictions for `user_${id}` feeds
- keep upcoming/past behavior using `hasEnded` + index ordering (same pattern as legacy)
- attach `similarEventsCount` from the grouped row (feed-scoped)

Pseudo-shape:

```typescript
async function queryFeedGrouped(ctx, feedId, paginationOpts, filter) {
  const hasEnded = filter === "past";
  const order = filter === "upcoming" ? "asc" : "desc";

  const groupResults = await ctx.db
    .query("userFeedGroups")
    .withIndex("by_feed_hasEnded_startTime", (q) =>
      q.eq("feedId", feedId).eq("hasEnded", hasEnded),
    )
    .order(order)
    .paginate(paginationOpts);

  const events = await Promise.all(
    groupResults.page.map(async (groupRow) => {
      const event = await getEventById(ctx, groupRow.primaryEventId);
      if (!event) return null;
      return { ...event, similarEventsCount: groupRow.similarEventsCount };
    }),
  );

  return { ...groupResults, page: events.filter((e) => e !== null) };
}
```

---

## Phase 6: Migrations

This repo already uses `@convex-dev/migrations` (see `packages/backend/convex/migrations/userFeedsMigration.ts`). Follow that pattern for new migrations.

### 6.1 Migration 1: Backfill `events.similarityGroupId`

**File:** `packages/backend/convex/migrations/backfillSimilarityGroupIds.ts` (NEW)

Process events in creation order (oldest first). For each event:

1. If already has `similarityGroupId`, skip
2. Find similar earlier events that already have a group ID
3. Patch with existing group or generate a new one

Use smaller batches (similarity checks are expensive).

### 6.2 Migration 2: Backfill `userFeeds.similarityGroupId`

**File:** `packages/backend/convex/migrations/backfillUserFeedSimilarityGroupIds.ts` (NEW)

Iterate `userFeeds`:

- fetch the referenced event by custom id (`events.by_custom_id`)
- patch the feed entry with `similarityGroupId: event.similarityGroupId`

This makes `userFeeds` a reliable membership source for grouped derivation.

### 6.3 Migration 3: Backfill `userFeedGroups` from `userFeeds`

**File:** `packages/backend/convex/migrations/backfillUserFeedGroups.ts` (NEW)

Iterate `userFeeds` entries as the membership source:

- if entry has no `similarityGroupId`, skip (until prior migration completes)
- call `upsertGroupedFeedEntryFromMembership(ctx, { feedId, similarityGroupId })`
  - idempotent: safe to call multiple times per group

---

## Phase 7: Background Maintenance (hasEnded)

Legacy `userFeeds.hasEnded` is maintained by a cron (`internal.feeds.updateHasEndedFlagsAction` in `packages/backend/convex/crons.ts`).

Add an equivalent maintenance job for `userFeedGroups.hasEnded` so grouped feeds paginate correctly across upcoming/past.

Options:

- **Cron-based update (recommended):** `updateHasEndedFlagsForFeedGroupsAction` every 15 minutes, same as legacy.
- Keep the `by_feed_hasEnded_startTime` index effective by ensuring `hasEnded` is accurate.

---

## Phase 8: Client Simplification (Expo)

**File:** `apps/expo/src/components/UserEventsList.tsx`

New clients should call the grouped query and stop doing client-side collapsing:

- remove `collapseSimilarEvents(events, user?.id)` usage for grouped feeds
- render the returned events directly
- pass `similarEventsCount` from `event.similarEventsCount` (server-provided)

Keep legacy path intact until backend rollout completes.

---

## Files to Modify (Updated Summary)

| File                                                                       | Changes                                                                                               |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `packages/backend/convex/schema.ts`                                        | Add `events.similarityGroupId`, add `userFeeds.similarityGroupId` + index, add `userFeedGroups` table |
| `packages/backend/convex/model/similarityHelpers.ts`                       | NEW: similarity + group utilities, plus feed-scoped primary selection                                 |
| `packages/backend/convex/feedHelpers.ts`                                   | Set `userFeeds.similarityGroupId` on all insert/upsert paths (additive fields/args)                   |
| `packages/backend/convex/feedGroupHelpers.ts`                              | NEW: derived grouped feed maintenance from `userFeeds` membership                                     |
| `packages/backend/convex/feeds.ts`                                         | Add grouped feed query (legacy untouched) + grouped hasEnded updater                                  |
| `packages/backend/convex/migrations/backfillSimilarityGroupIds.ts`         | NEW                                                                                                   |
| `packages/backend/convex/migrations/backfillUserFeedSimilarityGroupIds.ts` | NEW                                                                                                   |
| `packages/backend/convex/migrations/backfillUserFeedGroups.ts`             | NEW                                                                                                   |
| `apps/expo/src/components/UserEventsList.tsx`                              | Use grouped query; remove client-side collapsing when on grouped feeds                                |

---

## Verification Plan

### 1. Privacy / correctness

- Create public event A (showDiscover=true) and private event B that is similar.
- Verify `discover` grouped feed never returns B as primary and never counts B in `similarEventsCount`.

### 2. Membership correctness across sources

- Follow event → confirm grouped entry appears and count updates.
- Add event to list → confirm list followers see grouped entry.
- Unfollow event / remove from list → confirm grouped entry updates/removes if no members.

### 3. Pagination

- Create 50+ events with duplicates spanning multiple pages.
- Confirm grouped pagination never splits a group across pages.

### 4. Migrations

- Run migration 1 (events group ids) → all events patched
- Run migration 2 (userFeeds group ids) → all feed entries patched
- Run migration 3 (userFeedGroups backfill) → deduped rows created

---

## Backward Compatibility

- Existing clients are unaffected: legacy feed queries and response shape remain unchanged.
- Updated clients require new backend (grouped query + new tables/fields).

---

## Risks and Mitigations

| Risk                                  | Mitigation                                                            |
| ------------------------------------- | --------------------------------------------------------------------- |
| Primary selection leaks wrong event   | Primary selection is feed-scoped via `userFeeds` membership           |
| Grouped feeds drift from legacy       | Ensure every `userFeeds` insert/delete triggers grouped upsert/remove |
| `hasEnded` drift breaks upcoming/past | Add grouped hasEnded cron similar to legacy                           |
| Migration order issues                | Enforce: events group ids → userFeeds group ids → grouped backfill    |

---

## Implementation Order

1. Schema: add fields/indexes + `userFeedGroups` table (safe additive)
2. Similarity helpers (group ID + similarity detection + feed-scoped primary selection)
3. Update `feedHelpers` to populate `userFeeds.similarityGroupId` everywhere it inserts/patches
4. Add `feedGroupHelpers` and wire it into feed write paths
5. Add grouped feed query in `feeds.ts` (legacy untouched)
6. Deploy backend
7. Run migrations (1 → 2 → 3)
8. Enable grouped hasEnded cron
9. Ship updated client that calls grouped query only
