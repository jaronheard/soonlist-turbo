---
title: "feat: Event Savers Dialog with Rich Inline Row"
type: feat
status: active
date: 2026-04-08
origin: docs/brainstorms/2026-04-08-event-savers-dialog-requirements.md
---

# feat: Event Savers Dialog with Rich Inline Row

## Overview

Replace the current `EventSaversRow` inline expand/collapse with a two-tier display: a rich inline row for simple cases (≤2 items) and a native pageSheet dialog for overflow (>2 items). The dialog shows two sections — "Saved By" (users with profile links) and "Appears On" (event-level lists with share buttons). This makes user profiles, lists, and event provenance properly discoverable from feed cards.

This is a **frontend-only change** — `getEventById()` already returns full list data for every event. No new backend queries or enrichment needed.

## Problem Frame

The current `EventSaversRow` shows stacked avatars with truncated names. Names are tiny, lists aren't linked, affordances are unclear, and the "+N more" expand rarely triggers. When you've saved an event and one other person has too, the 2-icon row provides no context about who they are or how they found the event. (see origin: `docs/brainstorms/2026-04-08-event-savers-dialog-requirements.md`)

## Requirements Trace

- R1-R3. Rich inline row with linked names/lists (≤2 items)
- R4. Creator shows "Captured" with emphasis; others show "Saved"
- R5. Overflow row: names prioritized, "+N more", list count — tappable to dialog
- R6-R7. PageSheet modal with Done + swipe-to-dismiss
- R8-R10. Dialog "Saved By" section: avatar, full name, role, tappable to profile
- R11-R13. Dialog "Appears On" section: non-personal lists with share buttons
- R14-R15. Share actions reuse existing patterns
- R16-R18. Event-level list data from `eventToLists`, filter personal lists

## Scope Boundaries

- **In scope:** Mobile (Expo) only
- **Out of scope:** Web event cards, schema changes, list follow/unfollow in dialog, analytics, per-saver list attribution
- **Out of scope:** Changing the 1-saver inline display

## Context & Research

### Relevant Code and Patterns

- `apps/expo/src/components/UserEventsList.tsx` — `EventSaversRow` (lines 75-315), `UserEventListItem` (lines 338+)
- `apps/expo/src/components/FollowedListsModal.tsx` — pageSheet modal pattern: `presentationStyle="pageSheet"`, `animationType="slide"`, FlatList content, share buttons
- `apps/expo/src/components/UserProfileFlair.tsx` — avatar emoji badge wrapper
- `apps/expo/src/hooks/useEventActions.ts` — `handleShare()` with PostHog tracking
- `packages/backend/convex/model/events.ts` — `getEventById()` (line 554+) already returns `{ ...event, user, eventFollows, comments, eventToLists, lists }` where `lists` is full `Doc<"lists">[]` including `isSystemList` field
- `packages/backend/convex/feeds.ts` — `queryFeed()` calls `getEventById()` per feed entry (line 81), so every event already has its full lists array
- `packages/backend/convex/schema.ts` — `lists` table has `isSystemList: v.optional(v.boolean())` and `systemListType` fields

### Key Data Discovery

**`getEventById()` already returns all needed list data.** The feed query calls `getEventById()` for every event, which fetches `eventToLists` entries and resolves each to a full list document. The client already has the `lists` array with `isSystemList` field — no new backend enrichment or query is needed. `listCount` can be computed client-side: `event.lists.filter(l => !l.isSystemList).length`.

### External References

No external research needed — strong local patterns exist for modals, sharing, and navigation.

## Key Technical Decisions

- **Frontend-only implementation:** `getEventById()` already returns full `lists` data. Compute `listCount` client-side from `event.lists.filter(l => !l.isSystemList)`. No new Convex queries needed.
- **Event-level lists, not per-saver:** `eventToLists` doesn't track who added the event. Showing lists as a separate "Appears On" section avoids unreliable attribution inference. (see origin)
- **Filter personal/system lists:** Every creator's event auto-adds to their personal list. Filter `isSystemList === true` (noting it's `v.optional(v.boolean())` — treat undefined as false).
- **Reuse `FollowedListsModal` pattern:** Same `presentationStyle="pageSheet"` + `animationType="slide"` + FlatList. Extract into a new `EventSaversDialog` component.
- **Item counting for threshold:** Count people (creator + savers) + non-personal lists. If ≤2, rich inline. If >2, overflow → dialog.

## Open Questions

### Resolved During Planning

- **How to get list data for the dialog?** Already available — `getEventById()` returns full `lists` array. No new query needed.
- **How does the inline row know the list count?** Compute client-side from `event.lists.filter(l => !l.isSystemList).length`.
- **Priority: creator label vs list?** Creator always shows "Captured". They appear in the "Saved By" section, not "Appears On". Personal lists are filtered. No overlap.
- **Share behavior for "Saved By" rows?** No per-row share buttons in "Saved By" section. Share buttons only appear on list rows in "Appears On".

### Deferred to Implementation

- Visual treatment for "Captured" label (accent color, icon, or badge) — determine during design iteration
- Whether the overflow inline row should show avatar stacking or a simpler layout — try existing stacking first
- Dialog navigation behavior: should the dialog dismiss before navigating to a profile or list, or stay open? Follow `FollowedListsModal` pattern (likely dismiss first)

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
Data flow (no backend changes needed):
  Feed query (existing)
    → getEventById() already returns event.lists (full Doc<"lists">[])
    → Pass event.lists through to EventSaversRow

  Client-side computation:
    nonPersonalLists = event.lists.filter(l => !l.isSystemList)
    listCount = nonPersonalLists.length
    itemCount = people.length + listCount

  Inline display logic:
    if itemCount <= 2 → rich inline (linked names, linked list name if 1 list)
    if itemCount > 2  → overflow row (names + "+N more" + "· N lists") → tappable

  Dialog (uses same event.lists data, no extra query):
    → EventSaversDialog renders:
       Section 1: "Saved By" — avatar + name + Captured/Saved
       Section 2: "Appears On" — nonPersonalLists with list name + share button
       States: loading (N/A — data already available), empty (hide section), error (N/A)
```

## Implementation Units

- [ ] **Unit 1: Create `EventSaversDialog` component**

**Goal:** Build the pageSheet modal that shows "Saved By" and "Appears On" sections.

**Requirements:** R6, R7, R8, R9, R10, R11, R12, R13, R14, R15

**Dependencies:** None

**Files:**
- Create: `apps/expo/src/components/EventSaversDialog.tsx`
- Test: `apps/expo/src/components/__tests__/EventSaversDialog.test.tsx`

**Approach:**
- React Native `Modal` with `presentationStyle="pageSheet"` and `animationType="slide"` (follow `FollowedListsModal` pattern)
- Props: `visible`, `onClose`, `eventId`, `creator`, `savers`, `lists` (non-personal, pre-filtered), `currentUserId`
- Two sections rendered in a `ScrollView` or `SectionList`:
  - **"Saved By"**: Creator first (with "Captured" label + visual emphasis), then savers (with "Saved" label). Each row: `UserProfileFlair`-wrapped avatar + full display name + role label. Tappable → dismiss dialog then navigate to profile.
  - **"Appears On"**: Non-personal lists passed as prop. Each row: list icon + list name (tappable → dismiss then navigate to list view) + share button (triggers `Share.share()` for list URL). If empty, hide the section entirely.
- "Done" button in header to dismiss
- Swipe-to-dismiss handled natively by `pageSheet` presentation

**Patterns to follow:**
- `apps/expo/src/components/FollowedListsModal.tsx` — modal structure, header, FlatList, dismiss-before-navigate pattern
- `apps/expo/src/components/UserEventsList.tsx` lines 255-314 — expanded saver row rendering (avatar + name)
- `apps/expo/src/hooks/useEventActions.ts` — share event pattern
- `apps/expo/src/components/FollowedListsModal.tsx` `handleShareList()` — share list pattern

**Test scenarios:**
- Happy path: Dialog renders with 2 savers + 2 lists, both sections visible
- Happy path: Tapping user name dismisses dialog and navigates to profile route
- Happy path: Tapping list name dismisses dialog and navigates to list route
- Happy path: Share button triggers `Share.share()` with list URL
- Edge case: No lists (empty lists prop) — "Appears On" section hidden entirely
- Edge case: Creator is the only saver — "Saved By" shows just one row with "Captured"
- Edge case: Creator is current user — profile tap goes to settings instead

**Verification:**
- Dialog opens as pageSheet with slide animation
- Both sections render correctly
- All tap targets navigate correctly after dismissing dialog
- Share works for lists
- Swipe-to-dismiss and Done button both close the dialog

---

- [ ] **Unit 2: Refactor `EventSaversRow` for two-tier display**

**Goal:** Replace the current inline expand/collapse with the two-tier display: rich inline (≤2 items) with linked names/lists, overflow row (>2 items) that opens the dialog.

**Requirements:** R1, R2, R3, R4, R5, R18

**Dependencies:** Unit 1 (EventSaversDialog)

**Files:**
- Modify: `apps/expo/src/components/UserEventsList.tsx` (EventSaversRow component, lines 75-315)
- Test: `apps/expo/src/components/__tests__/UserEventsList.test.tsx`

**Approach:**
- Remove the `isExpanded` state and inline expanded view (lines 92, 255-314)
- Add `lists` (full list docs from event data) to component props
- Compute client-side: `nonPersonalLists = lists.filter(l => !l.isSystemList)`, `listCount = nonPersonalLists.length`, `itemCount = allUsers.length + listCount`
- **Rich inline (itemCount ≤ 2):**
  - Show all users with tappable names (navigate to profile)
  - If 1 non-personal list: show tappable list name (navigate to list view)
  - Creator shows "Captured" label with visual emphasis
  - Others show "Saved" label
- **Overflow (itemCount > 2):**
  - Show up to 2 names + "+N more" for extra people
  - Show "· N lists" count or single list name if only 1
  - Entire row tappable → opens `EventSaversDialog`
- Add `visible` state for dialog, render `EventSaversDialog` conditionally with `nonPersonalLists` passed as prop
- For 1 saver with 0 lists (itemCount=1): keep current simple display (no dialog trigger)
- **Fallback:** If `lists` is undefined/null, treat as empty array (listCount=0)

**Patterns to follow:**
- Current `EventSaversRow` avatar stacking and name rendering (preserve visual style)
- `renderTappableName()` helper (line 119-133) — extend for list name tapping

**Test scenarios:**
- Happy path: 1 person + 0 lists (itemCount=1) → simple inline, no dialog trigger
- Happy path: 1 person + 1 list (itemCount=2) → rich inline with linked name + linked list
- Happy path: 2 people + 1 list (itemCount=3) → overflow row: "Jaron, Sarah via Portland Events" tappable
- Happy path: 3 people + 2 lists (itemCount=5) → overflow: "Jaron, Sarah +1 more · 2 lists" tappable
- Happy path: Tapping overflow row opens EventSaversDialog
- Edge case: Creator is the current user → "Captured" label still shown, profile tap goes to settings
- Edge case: 2 people + 0 lists (itemCount=2) → rich inline, names only, no list reference
- Edge case: `lists` prop is undefined → treated as 0 lists
- Edge case: List has `isSystemList: undefined` → treated as non-system (shown)
- Integration: Dialog receives correct props (creator, savers, nonPersonalLists)

**Verification:**
- Inline displays correctly for all threshold cases
- Overflow triggers dialog
- Names and lists are tappable with correct navigation
- No more inline expand/collapse behavior

---

- [ ] **Unit 3: Wire up data flow from feed to components**

**Goal:** Pass `event.lists` from the feed query through to `EventSaversRow`.

**Requirements:** R1, R5, R17

**Dependencies:** Unit 2 (refactored EventSaversRow)

**Files:**
- Modify: `apps/expo/src/components/UserEventsList.tsx` (UserEventListItem props, data extraction)
- Modify: `apps/expo/src/app/(tabs)/feed/index.tsx` (if feed screen needs adjustment)
- Modify: `apps/expo/src/app/(tabs)/discover.tsx` (if discover screen needs adjustment)

**Approach:**
- Add `lists` to `UserEventListItem` props (type: array of list docs)
- Extract `lists` from the event data (already returned by `getEventById()`)
- Pass through to `EventSaversRow`
- Verify all feed screens (My Scene, Discover, profile/following) pass the data correctly
- The `sourceListName` prop can be kept for backward compatibility or deprecated in favor of computing from `lists`

**Patterns to follow:**
- Current `sourceListName` extraction pattern in `UserEventListItem` (line 1242-1243)
- How `eventFollows` / `savers` are currently passed through

**Test scenarios:**
- Happy path: `event.lists` flows from feed data → UserEventListItem → EventSaversRow
- Happy path: All feed screens (feed, discover, following) pass lists correctly
- Edge case: `event.lists` undefined/null → treated as empty array
- Edge case: Grouped feed events also receive lists data

**Verification:**
- The two-tier display works correctly across all feed screens
- No regressions in existing event card behavior

## System-Wide Impact

- **Interaction graph:** `EventSaversRow` → new `EventSaversDialog`. No new backend queries — uses existing `getEventById()` data.
- **Error propagation:** No new failure modes — all data is already fetched by the feed query. If `lists` is missing, degrade gracefully (listCount=0).
- **State lifecycle risks:** Dialog uses data already in memory (no lazy loading). No cache coherence issues.
- **API surface parity:** Web event cards are out of scope. No shared API changes.
- **Unchanged invariants:** Current event saving, following, and list management behavior is not modified. Backend is untouched.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `event.lists` might not be passed through all feed screen paths | Verify data flow in discover, feed, and following screens during Unit 3 |
| Overflow copy gets too long for narrow screens | Truncate with ellipsis; test on small devices |
| `isSystemList` is `v.optional(v.boolean())` — undefined vs false | Treat both undefined and false as "not system" (show in "Appears On") |
| Dialog navigation + dismiss timing | Follow `FollowedListsModal` pattern: dismiss first, then navigate |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-08-event-savers-dialog-requirements.md](docs/brainstorms/2026-04-08-event-savers-dialog-requirements.md)
- Related code: `apps/expo/src/components/UserEventsList.tsx`, `apps/expo/src/components/FollowedListsModal.tsx`
- Related code: `packages/backend/convex/model/events.ts` (`getEventById` line 554+), `packages/backend/convex/feeds.ts`
