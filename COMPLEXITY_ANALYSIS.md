# Codebase Complexity Analysis

Analysis of the biggest complexity hotspots in the Soonlist codebase, with concrete simplification recommendations aligned to the principles: simple skimmable code, minimal states, discriminated unions, exhaustive handling, no defensive code, assertions over defaults, fewer lines, early returns, low argument counts.

---

## Top 5 Blockers (Structural Issues Making Everything Harder)

### 1. God Zustand Store (`apps/expo/src/store.ts` — 700 lines)

**The problem:** One store with 60+ state properties and actions mixing completely unrelated concerns: UI preferences (tab labels, icons, subtitles), event input state, onboarding, media permissions, paywall tracking, workflow IDs, badge counts, timezone, and more.

**Why it's a blocker:** Every component that touches the store re-renders on unrelated changes. The `resetStore` and `resetForLogout` functions are 50+ lines each because they must enumerate every field. The `addEventState`/`newEventState` duplication forces every setter to take a `route: "add" | "new"` parameter and branch on it — 7 identical setter patterns (lines 296-345).

**Simplification:**
- Split into 3-4 focused stores: `useEventInputStore`, `usePreferencesStore`, `useOnboardingStore`, `usePaywallStore`
- The `addEventState` / `newEventState` duplication is the worst offender — these are the same shape with one extra field. Use a single `eventInputState` with a discriminated union:
  ```typescript
  type EventInputState =
    | { route: "add"; isOptionSelected: boolean; activeInput: "camera" | "upload" | "url" | "describe" | null; /* ...common */ }
    | { route: "new"; /* ...common */ }
  ```
- Remove the 7 route-branching setters, replace with one `updateEventInput(patch)` that merges into the current state
- Move the 11 tab label/icon/subtitle preferences to a single `preferences` object instead of 11 separate fields with 11 separate setters

**Impact:** Fewer re-renders, simpler resets, dramatically less code.

---

### 2. EventDisplays.tsx — Kitchen Sink Component (1,481 lines)

**The problem:** This single file contains 8+ components: `EventMetadataDisplay`, `EventDateDisplaySimple`, `EventDetailsCard`, `EventDetails`, `DateAndTimeDisplay`, `EventPageImage`, plus the main `AddToCalendarCard` variants. These share timezone logic that's copy-pasted between them.

**Why it's a blocker:**
- The same null checks for `startDate`, `endDate`, `timezone` appear 3 times (lines 234, 303, 428) with `console.error` + return null — these should be required props with asserts
- `getDateTimeInfo` / `getDateInfoUTC` calls are duplicated in every sub-component
- `DateAndTimeDisplay` takes 9+ props (lines 339-350), several of which are `|| undefined` conversions

**Simplification:**
- Make `startDate`, `endDate`, `timezone` **required** (non-optional) in all component props — they always exist in practice
- Remove the defensive `console.error` + `return null` guards (3 occurrences) — trust the types
- Compute `startDateInfo`/`endDateInfo` once at the top level and pass down instead of recomputing in every sub-component
- Delete the commented-out code (lines 247-252)
- Split file by actual usage: keep the main `AddToCalendarCard` in its own file, move the detail sub-components alongside

---

### 3. Duplicate `transformEventData` (PublishButton.tsx + UpdateButton.tsx)

**The problem:** `apps/web/components/PublishButton.tsx` (lines 25-41) and `apps/web/components/UpdateButton.tsx` (lines 29-45) contain **identical** `transformEventData` functions plus identical `transformLists` functions.

**Why it's a blocker:** Every change to event data transformation must be made in two places. The functions also use defensive `|| ""` fallbacks for every field instead of asserting the data exists.

**Simplification:**
- Extract one shared `transformEventData` function
- Replace `event.name || ""` patterns with direct access — if the event doesn't have a name, that's a bug upstream, not something to silently default
- Same for `transformLists` — extract and share

---

### 4. Defensive Null Checks Everywhere When Types Guarantee Values

**Pattern found across the codebase:**

| File | Line | Pattern |
|------|------|---------|
| `EventDisplays.tsx` | 234, 303, 428 | `if (!startDate) { console.error(...); return null }` on required props |
| `EventDisplays.tsx` | 80, 88 | `eventMetadata.mentions \|\| []` then `(eventMetadata.mentions \|\| [])[0]` — check once |
| `feedHelpers.ts` | 76 | `(creator?.publicMetadata as { showDiscover?: boolean } \| null)?.showDiscover ?? false` — complex cast chain |
| `EventDetailsCard` | 328, 333 | Null check on computed values that can't be null given the prior guard |
| `useDragAndDropHandler.ts` | 52-60 | 5 separate state flags for one drag operation |

**Simplification:** Assert at data boundaries (API responses, form submissions), then trust types downstream. Replace `x || defaultValue` with direct access. Use `invariant()` / `assert()` helper at the few places you genuinely need runtime checks.

---

### 5. Backend Model Layer Over-Engineering (`packages/backend/convex/model/events.ts` — 1,650 lines)

**The problem:** The event enrichment pipeline (lines 69-170) does 3 nested `Promise.all` calls, builds 3 separate `Map` objects for batch caching, and has a custom deduplication helper — all to avoid N+1 queries. This is the right optimization but the implementation is hard to follow.

**Simplification:**
- Extract a `batchLookup<T>(ids, fetcher)` utility that returns a `Map<Id, T>` — replace the 3 manual Map-building blocks
- Flatten the nested Promise.all into a single parallel fetch at the top, then a single enrichment pass
- The `getUniqueIds` helper (lines 40-49) is a one-liner with `[...new Set(ids)]` — inline it

---

## Medium Priority: Code That Should Be Simpler

### 6. `useDragAndDropHandler.ts` — Too Many State Flags

5 separate state variables (`isDragging`, `isProcessing`, `error`, `hasValidationError`, `validationMessage`) plus 2 refs (`dragCounterRef`, `processingRef`) for a drag-and-drop handler. This is a state machine with ~8 possible combinations, most of which are invalid.

**Fix:** Use a discriminated union:
```typescript
type DragState =
  | { status: "idle" }
  | { status: "dragging" }
  | { status: "processing" }
  | { status: "error"; message: string }
  | { status: "validationError"; message: string }
```

One `useState` instead of five. Impossible states become unrepresentable.

### 7. `users.ts` — Username Generation (1,395 lines)

The username generation algorithm (lines 16-100) tries 5+ candidate formats, logs at 6+ points, and retries against the database. The extensive `console.log` calls suggest this was debugged by print-statement.

**Fix:** Remove the debug logging. Simplify candidate generation to 2 strategies (slug, slug + random suffix). Assert the final result exists instead of returning potentially undefined.

### 8. `aiHelpers.ts` — Hand-Rolled JSON Extraction

Lines 43-90 contain a hand-written JSON parser that tracks bracket nesting and string escaping to extract JSON from LLM output.

**Fix:** Use structured output from the AI SDK (which this codebase already uses in some places). If free-text parsing is truly needed, a simple regex for fenced code blocks + `JSON.parse` with a try/catch is sufficient — the manual state machine is unnecessary complexity.

### 9. EventCard Props — Too Many Optional Props That Are Always Provided

`EventCard` (line 14-34) has 20+ props, 10 of which are marked optional but always provided by callers (e.g., `calendarButton`, `followButton`, `editButton`, `deleteButton`).

**Fix:** Make always-provided props required. Group related props into objects:
```typescript
// Instead of 4 separate button props
actions: {
  calendar: ReactNode;
  follow: ReactNode;
  edit: ReactNode;
  delete: ReactNode;
}
```

### 10. Three-Layer Schema Duplication

The same data shapes are defined in three places:

1. **Convex schema** (`packages/backend/convex/schema.ts`) — `v.object()` validators like `onboardingDataValidator`, `userAdditionalInfoValidator`
2. **Validators package** (`packages/validators/src/`) — Zod schemas like `userAdditionalInfoSchema`, plus TypeScript interfaces (`User`, `Event`, `List`, etc.)
3. **Component-level types** — prop interfaces in EventDisplays.tsx, EventCard.tsx, etc.

Example: `onboardingData` is defined as a Convex validator, a TypeScript interface in `packages/validators`, a Zustand state shape, and inline in component props.

**Fix:** Convex should be the single source of truth. Export types from Convex `Doc<"tableName">` and use those downstream. The `packages/validators` types should be auto-derived or deleted. Component props should reference the Convex types directly.

### 11. EventCard Props Drilling

`EventCard` takes 18 individual props instead of compound objects. User info is spread across 4 props (`userAvatar`, `userName`, `userDisplayName`, `userEmoji`), event details across 7 props, and buttons across 5 props.

**Fix:** Group into compound objects: `user: { avatar, name, displayName, emoji }`, `actions: { calendar, follow, edit, delete }`. This cuts the prop count from 18 to ~6.

### 12. Prototype/Dead Code Still in the Codebase

- `apps/web/app/(prototypes)/onboarding-prototypes/` — 1,100+ lines of prototype code
- `apps/web/app/(base)/2024/` — Year-specific data files (1,091 + 438 lines)
- `packages/backend/convex/workflows/testFailures.ts` — 749 lines of test failure workflow
- `useRefreshTimestampOnFocus` (store.ts lines 654-667) — hook body is entirely commented out

**Fix:** Delete prototype code. Archive 2024-specific code if needed for reference. Remove commented-out code.

---

## Quick Wins (< 30 min each)

| # | What | Where | Principle |
|---|------|-------|-----------|
| 1 | Delete commented-out code in EventDisplays | Lines 247-252, etc. | Fewer lines |
| 2 | Remove `console.error` + null guards on typed props | EventDisplays 234, 303, 428 | No defensive code |
| 3 | Inline `getUniqueIds` — it's `[...new Set()]` | model/events.ts:40 | Don't extract one-liners |
| 4 | Delete `useRefreshTimestampOnFocus` (body commented out) | store.ts:654 | Remove dead code |
| 5 | Merge duplicate `transformEventData` | PublishButton + UpdateButton | DRY |
| 6 | Make `EventCard` button props required | EventCard.tsx | Don't make args optional if required |
| 7 | Remove `|| ""` / `|| []` fallbacks on typed fields | PublishButton, EventDisplays | Use asserts, not defaults |
| 8 | Consolidate `addEventState`/`newEventState` setters | store.ts:296-345 | Minimize state |
| 9 | Replace 5 drag-drop state vars with discriminated union | useDragAndDropHandler.ts | Discriminated unions |
| 10 | Remove debug `console.log` from username generation | users.ts | Fewer lines |

---

## Summary

The two biggest structural simplifications that would cascade through the whole codebase:

1. **Split the Zustand store** — eliminates the route-branching duplication, reduces reset complexity, prevents unrelated re-renders
2. **Trust the type system** — remove defensive null checks on typed props across EventDisplays and related components, make props required when they're always provided, use asserts at data boundaries instead of silent fallbacks

Everything else flows from these two principles: when you trust your types and minimize your state surface, the code naturally becomes skimmable and simple.
