---
date: 2026-04-08
topic: event-savers-dialog
---

# Event Savers Dialog

## Problem Frame

The `EventSaversRow` on feed cards shows a compact row of stacked avatars and truncated names when multiple people have saved an event. The current experience has several gaps:

- **Names are truncated** — tiny `text-xs` display names don't show who actually saved the event
- **Lists aren't linked** — source list names appear as plain text with no tap target to navigate to the list or share it
- **Unclear affordances** — avatars and names are tappable (to profiles), but nothing visually signals this; the overall row feels inert
- **No way to see all savers** — the "+N more" expand only triggers at 3+ savers, which rarely happens
- **You + 1 other person** — when you've saved an event and one other person has too, you see 2 profile icons with no context about who they are or how they found the event; the compact row doesn't help you discover the other person or their list

This feature adds a native-feeling pageSheet dialog that opens when users tap the saver area (2+ savers), showing each saver with their full name, the list they saved the event to (tappable), and share actions — making profiles, lists, and provenance properly discoverable.

## User Flow

```
Feed Card — Inline (≤2 items: 1 person + 1 list)
┌─────────────────────────────────────────┐
│  👤 Jaron  ✨ via Capture               │
│  ───── or ─────                         │
│  👤 Sarah  via "Weekend Plans"          │
│       ↑ tappable    ↑ tappable          │
└─────────────────────────────────────────┘

Feed Card — Overflow (>2 items) → entire row tappable to dialog

  2 people, 1 list:
    👤👤 Jaron, Sarah via "Portland Events"

  2 people, 2 lists:
    👤👤 Jaron, Sarah · 2 lists

  3 people, 1 list:
    👤👤 Jaron, Sarah +1 more · 1 list

  3 people, 3 lists:
    👤👤 Jaron, Sarah +1 more · 3 lists
         │
         ▼
┌─────────────────────────────┐
│  Event Savers          Done │
│─────────────────────────────│
│  👤 Jaron Heard             │
│     ✨ via Capture     [↗]  │
│                             │
│  👤 Sarah Kim               │
│     via "Weekend Plans" [↗] │
│                             │
│  👤 Alex Chen               │
│     via Save           [↗]  │
└─────────────────────────────┘
    ├── Tap user → profile
    ├── Tap list name → list view
    └── Tap [↗] → native share sheet
```

## Requirements

**Rich Inline Row (≤2 items)**
- R1. When total items (people + lists) ≤ 2, show a rich inline row with linked names and linked list names
- R2. User names are tappable → navigate to profile
- R3. List names are tappable → navigate to list view
- R4. Creator shows "Captured" with visual emphasis; other savers show "Saved"

**Dialog Trigger & Overflow (>2 items)**
- R5. When total items > 2, show an overflow inline row: prioritize names (show up to 2), then "+N more" for additional people, then list count (e.g., "· 2 lists") or single list name if only 1 list. Entire row tappable to open dialog.
- R6. Modal uses the same `presentationStyle="pageSheet"` + `animationType="slide"` pattern as `FollowedListsModal`
- R7. Modal has a "Done" button to dismiss, and supports swipe-to-dismiss

**Dialog Content — Two Sections**
- R8. "Saved By" section: each row shows avatar (with `UserProfileFlair`), full display name, and role label
- R9. Creator (`events.userId` matches): "Captured" with visual emphasis; all others: "Saved"
- R10. Tapping a user's avatar or name navigates to their profile
- R11. "Appears On" section: all non-personal lists the event belongs to (from `eventToLists`), each with list name and share button
- R12. Tapping a list name navigates to the list view
- R13. Each list row has a share button that triggers `Share.share()` for that list

**Share Actions**
- R14. List share buttons use `Share.share()` for the list URL
- R15. Reuse existing `Share.share()` patterns from `useEventActions` and `FollowedListsModal`

**Data**
- R16. Fetch all non-personal lists for the event via `eventToLists` (filter out `isSystemList: true` lists)
- R17. Support multiple lists per event (not just a single `sourceListName`)
- R18. Creator is always listed first in the "Saved By" section

## Success Criteria

- Users can discover all savers and the lists events appear on from any feed card
- "via Capture" clearly distinguishes original captures from list saves
- Every user name, list name, and share button is tappable and functional
- Dialog feels native (pageSheet, swipe-to-dismiss, smooth transitions)
- No new dependencies — reuses existing modal, share, and navigation patterns

## Scope Boundaries

- **In scope:** Mobile (Expo) only
- **Out of scope:** Web event cards, new Convex tables or schema changes, list follow/unfollow actions from the dialog, analytics/tracking for dialog interactions (can add later)
- **Out of scope:** Changing the collapsed saver display (avatars + names on the card itself)

## Key Decisions

- **Two-tier display:** Rich inline for simple cases (≤2 items), pageSheet dialog for overflow — avoids unnecessary modals while ensuring discoverability
- **2-item inline threshold:** Max 1 person + 1 list inline; anything more triggers dialog to prevent crowding
- **pageSheet modal over bottom sheet:** Matches `FollowedListsModal` pattern, feels native on iOS, no new dependencies
- **Overflow copy pattern:** Names prioritized over lists; show up to 2 names, "+N more" for extra people, "· N lists" or "via [List Name]" for list context
- **"Captured" labeling:** Distinguishes creators from savers — makes event provenance visible
- **Event-level lists (not per-saver):** Show lists the event appears on as a separate "Appears On" section, not per-saver. Avoids unreliable data inference from cross-referencing `eventToLists` with list ownership.
- **Filter personal lists:** System/personal lists (`isSystemList: true`) are excluded from the "Appears On" section — they're internal and confusing to show

## Outstanding Questions

### Deferred to Planning
- [Affects R16][Needs research] How to efficiently fetch all non-personal lists for an event in the feed query? May need a new Convex query.
- [Affects R9][Technical] What visual treatment for "Captured" — accent color, small icon, or subtle badge? Should be determined during implementation with design iteration.

## Next Steps

→ `/ce:plan` for structured implementation planning
