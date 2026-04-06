---
title: "fix: Repair follower feed propagation gap for contributor lists"
type: fix
status: active
date: 2026-04-05
deepened: 2026-04-05
---

# fix: Repair follower feed propagation gap for contributor lists

## Overview

Events added to the PDX Discover contributor list sometimes fail to propagate to all followers' `followedLists_` feeds. The root cause is that `addEventToContributorListsAction` is a two-step non-atomic action: step 1 (insert `eventToLists` record via mutation) can succeed while step 2 (fan out to follower feeds via separate mutation calls) fails silently. On retry, step 1's idempotency guard returns empty, so step 2 is permanently skipped. This creates orphaned list entries with no corresponding feed entries.

The fix restructures the code to match the established codebase pattern: schedule fanout inside the mutation transaction, not from an action wrapper. This makes the `eventToLists` insert and the fanout scheduling atomic.

## Problem Frame

Production data showed 4 events from 3 contributors missing from the PDX Discover list's follower feeds despite being public events from valid contributors. Investigation proved:
- The code logic is correct (dry-run confirmed all checks pass)
- The contributor memberships existed before the events were created
- `updateEventInFeeds` completed successfully (discover feed entries exist)
- But `eventToLists` records were never created for these events

The root cause is an architectural anti-pattern: the action wrapper (`addEventToContributorListsAction`) orchestrates two separate mutation transactions. If the action fails after mutation 1 commits, retries skip mutation 2 due to mutation 1's idempotency guard. Every other analogous operation in the codebase (`backfillContributorEventsBatch`, `removeContributorEventsBatch`, `bulkUpdateEventVisibilityBatch`) avoids this by scheduling follow-up work inside the mutation via `ctx.scheduler.runAfter`.

## Requirements Trace

- R1. All public events from contributors must appear in every follower's `followedLists_` feed
- R2. Repairs must be idempotent and safe to re-run (uses existing `upsertFeedEntry`)
- R3. Future event additions must be resilient: the `eventToLists` insert and fanout scheduling must be atomic
- R4. Frontend must preserve `eventFollows` data in My Scene tab (done: PR #966)

## Scope Boundaries

- Not modifying `getDiscoverFeed` or `getFollowedListsFeed` query logic
- Not cleaning up legacy `discover` feedId entries
- Not adding automated cron reconciliation (manual-run first, cron if gaps recur)

## Context & Research

### Relevant Code and Patterns

- `packages/backend/convex/lists.ts` `backfillContributorEventsBatch` (line 1062) — **the model pattern**: inserts `eventToLists` and schedules `addEventToListFollowersFeeds` in the same mutation transaction
- `packages/backend/convex/lists.ts` `removeContributorEventsBatch` (line 954) — same pattern for removal
- `packages/backend/convex/feedHelpers.ts` `addEventToContributorLists` (line 863) — the mutation that needs restructuring
- `packages/backend/convex/feedHelpers.ts` `addEventToContributorListsAction` (line 912) — the action wrapper to eliminate
- `packages/backend/convex/feedHelpers.ts` `updateEventInFeeds` (line 9) — the caller that schedules the action (needs to schedule the mutation instead)
- `packages/backend/convex/feedHelpers.ts` `addEventToListFollowersFeeds` (line 572) — the fanout function, already idempotent via `upsertFeedEntry`

### Convex Guidelines

Per `convex_rules.mdc` line 85: *"Try to use as few calls from actions to queries and mutations as possible. Queries and mutations are transactions, so splitting logic up into multiple calls introduces the risk of race conditions."*

### Four-Agent Review Findings

Four independent code reviewers (correctness, reliability, adversarial, architecture) unanimously agreed:
- Option A (inner catch swallows errors) causes silent permanent data loss
- Option B (remove inner catch, let error propagate) is strictly worse — blocks OTHER lists' fanout too, and retries are no-ops
- Option C (restructure to schedule from mutation) is the correct fix, matching established codebase patterns

## Key Technical Decisions

- **Move fanout scheduling into the mutation, not the action**: The `addEventToContributorLists` mutation should schedule `addEventToListFollowersFeeds` via `ctx.scheduler.runAfter(0, ...)` for each list, making the insert and schedule atomic. This matches `backfillContributorEventsBatch`.
- **Eliminate the action wrapper**: Since `addEventToContributorLists` handles a single event (not paginated data), no action loop is needed. The mutation can be scheduled directly from `updateEventInFeeds`.
- **Reconciliation migration for historical gaps**: A one-time migration repairs the 4 known orphaned events and any others. Separate from the forward-fix.
- **Batch size 50 for reconciliation**: Matches existing migration patterns to stay within Convex limits.

## Open Questions

### Resolved During Planning

- **Should we make the action atomic?** The action should be eliminated entirely. The mutation can schedule its own follow-up work atomically, matching the established pattern used by `backfillContributorEventsBatch`.
- **Can `updateEventInFeeds` call the mutation directly instead of scheduling?** Yes — `updateEventInFeeds` is itself a mutation. It can call `ctx.runMutation(internal.feedHelpers.addEventToContributorLists, ...)` synchronously, OR schedule it via `ctx.scheduler.runAfter(0, ...)`. Since `addEventToContributorLists` does DB reads + writes + scheduling, calling it inline is fine for a single event. Scheduling is safer if we're concerned about transaction size.

### Deferred to Implementation

- Whether to call `addEventToContributorLists` synchronously (inline) or schedule it from `updateEventInFeeds` — depends on observed transaction sizes
- Exact cursor strategy for the reconciliation migration — depends on available indexes

## Implementation Units

- [x] **Unit 1: Fix frontend eventFollows clearing** *(completed: PR #966)*

**Goal:** Preserve `eventFollows` data in My Scene tab so all savers display

**Requirements:** R4

**Files:**
- Modify: `apps/expo/src/app/(tabs)/following/index.tsx`

**Verification:** Already merged. My Scene shows multiple user avatars per event.

---

- [ ] **Unit 2: Restructure addEventToContributorLists to schedule fanout atomically**

**Goal:** Move fanout scheduling from the action wrapper into the mutation itself, making `eventToLists` insert and follower feed scheduling atomic. Eliminate the action wrapper.

**Requirements:** R3

**Dependencies:** None

**Files:**
- Modify: `packages/backend/convex/feedHelpers.ts` (`addEventToContributorLists`, `updateEventInFeeds`, delete `addEventToContributorListsAction`)

**Approach:**
- In `addEventToContributorLists` (the mutation), after each `ctx.db.insert("eventToLists", ...)`, add `ctx.scheduler.runAfter(0, internal.feedHelpers.addEventToListFollowersFeeds, { eventId, listId })` — matching the pattern in `backfillContributorEventsBatch` at `lists.ts:1103`
- In `updateEventInFeeds`, change `ctx.scheduler.runAfter(0, internal.feedHelpers.addEventToContributorListsAction, ...)` to `ctx.scheduler.runAfter(0, internal.feedHelpers.addEventToContributorLists, ...)`
- Delete `addEventToContributorListsAction` entirely
- Remove the `returns: v.array(v.string())` from `addEventToContributorLists` since the return value is no longer consumed by an action wrapper (change to `returns: v.null()`)

**Patterns to follow:**
- `packages/backend/convex/lists.ts` `backfillContributorEventsBatch` (line 1095-1110): same insert + schedule pattern
- `packages/backend/convex/lists.ts` `removeContributorEventsBatch` (line 986-993): same pattern for removal

**Test scenarios:**
- Happy path: Contributor creates public event -> `eventToLists` record created AND `addEventToListFollowersFeeds` scheduled in same transaction -> followers see event in `followedLists_` feeds
- Edge case: Contributor is member of 0 contributor lists -> mutation returns early, no scheduling
- Edge case: Event already in the list (idempotency) -> no insert, no scheduling, no error
- Integration: If `addEventToListFollowersFeeds` fails after being scheduled, it retries independently (Convex scheduler retry) without affecting the `eventToLists` record
- Edge case: Event is private -> `updateEventInFeeds` doesn't schedule the mutation (the `if (visibility === "public")` guard)

**Verification:**
- Create a test event from a known contributor and verify it appears in all followers' `followedLists_` feeds
- Verify no other callers reference `addEventToContributorListsAction` (grep confirms only `updateEventInFeeds` calls it)
- Confirm the pattern matches `backfillContributorEventsBatch`

---

- [ ] **Unit 3: Add reconciliation migration for contributor list feeds**

**Goal:** Create a migration that finds `eventToLists` records for contributor lists where follower feed entries are missing, and fills the gaps.

**Requirements:** R1, R2

**Dependencies:** None (can be done in parallel with Unit 2)

**Files:**
- Create: `packages/backend/convex/migrations/reconcileContributorListFeeds.ts`

**Approach:**
- Action orchestrator queries all contributor-type lists, then iterates their `eventToLists` in batches
- Batch mutation calls `addEventToListFollowersFeeds` for each event-list pair via `ctx.scheduler.runAfter(0, ...)` to avoid transaction limits
- Use cursor-based pagination with infinite-loop guard, batch size 50

**Patterns to follow:**
- `packages/backend/convex/migrations/backfillSourceListId.ts` for batch structure and cursor pattern
- `packages/backend/convex/feedHelpers.ts` `backfillContributorEvents` for infinite-loop guard

**Test scenarios:**
- Happy path: Event in `eventToLists` for PDX Discover with no `followedLists_` entries for any follower -> after reconciliation, all followers have the feed entry with correct `sourceListId`
- Edge case: Event already fully propagated -> reconciliation is a no-op (idempotent via `upsertFeedEntry`)
- Edge case: Event is private -> skipped (visibility check in `addEventToListFollowersFeeds`)
- Edge case: Event has been deleted -> skipped (null check in `addEventToListFollowersFeeds`)
- Edge case: Cursor doesn't advance -> migration aborts rather than infinite-looping

**Verification:**
- Run reconciliation on production
- Spot-check: compare PDX Discover `eventToLists` count with follower feed entry count — no gaps

## System-Wide Impact

- **Interaction graph:** `updateEventInFeeds` (mutation) -> schedules `addEventToContributorLists` (mutation) -> inserts `eventToLists` + schedules `addEventToListFollowersFeeds` (mutation per list). The reconciliation migration adds a new entry point to `addEventToListFollowersFeeds`.
- **Error propagation:** Each `addEventToListFollowersFeeds` call is an independently scheduled mutation with Convex's built-in retry. Failure of one list's fanout does not affect other lists.
- **State lifecycle risks:** `upsertFeedEntry` is idempotent — duplicate calls update rather than create duplicates. No risk of double-entries.
- **Unchanged invariants:** `getFollowedListsFeed`, `getDiscoverFeed`, and all other feed queries are unchanged. The `discover` feedId entries are preserved. `backfillContributorEventsBatch` in `lists.ts` already uses the target pattern and is unaffected.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Removing `addEventToContributorListsAction` could break other callers | Grep confirms only one caller (`updateEventInFeeds` line 92). Verify at implementation time. |
| Reconciliation on ~486 events x 71 followers = ~34k upserts could hit Convex limits | Use `scheduler.runAfter(0, ...)` for fan-out and batch size 50 with cursor pagination |
| Running reconciliation during peak usage could slow queries | Run during low-traffic window; `upsertFeedEntry` is a lightweight indexed operation |

## Sources & References

- Related PRs: #966 (frontend fix for eventFollows clearing)
- Related code: `packages/backend/convex/feedHelpers.ts`, `packages/backend/convex/lists.ts`
- Four-agent review: correctness, reliability, adversarial, and architecture reviewers all confirmed the restructuring approach
- Convex guidelines: `packages/backend/.cursor/rules/convex_rules.mdc` line 85
