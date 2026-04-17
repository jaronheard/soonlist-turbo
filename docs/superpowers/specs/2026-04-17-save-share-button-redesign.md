# Save / Share Button Redesign

**Status:** Draft · 2026-04-17
**Scope:** iOS app (Expo)

## Problem

The current save/share button on the event detail page and event list cards has three problems:

1. **Sluggish.** Tapping Save doesn't visibly respond until the Convex mutation completes. The optimistic update only fires when the `getSavedIdsForUser` query is preloaded, which often isn't true on the event detail page.
2. **Ambiguous "Saved" state.** In list cards, an already-saved event renders a greyed-out, disabled "Saved" pill. Users don't know they can unsave by tapping it.
3. **Awkward save→share morph.** The button morphs from "Save" to "Share" after a tap. The morph is supposed to be a feature (one button, two actions) but it ships only after the network round-trip completes, so users miss it. The "primary action is save and then share" intent doesn't come through.

## Intent

A redesigned flow where:

- The save tap is **instant** (local UI changes synchronously, mutation runs in the background).
- The "Saved" state is **clear and tappable** to unsave — never disabled.
- Every save offers an **immediate, optional Share prompt** via a Mail-style iOS toast — without interrupting users who just want to bookmark.

Save remains the primary action. Share is a frictionless follow-up, not a forced second tap.

## Decisions

- **Tap behavior:** Pure save with an optional share prompt (A3). No auto-opened share sheet.
- **Toast style:** Mail-style "Undo Send" banner — translucent blur, system green check, blue action text, 14pt rounded corners.
- **Where the toast appears:** Everywhere the save button is. List cards, discover feed, search results, event detail page. Unified pattern.
- **No confirmation step:** One-tap save. No list picker. (Multi-list save is C2 / future.)
- **Silent unsave:** Tapping the "Saved" button reverts to "Save" with no toast.
- **Web:** Unchanged. Web `SaveButton` continues iOS deep-link behavior.
- **Owner of event:** Unchanged. Owners see the existing Share button (no save needed).

## Interaction flow

### Save tap (unsaved → saved)

1. User taps `♡ Save`.
2. **Instantly** (no network wait):
   - Button morphs to `✓ Saved` — translucent grey pill, dark text. Tappable.
   - Light haptic fires (`Haptics.ImpactFeedbackStyle.Light`).
   - Toast slides up from the bottom: `✓  Saved to your list                    Share`
3. Convex mutation runs in background.
4. Toast auto-dismisses after **4 seconds** OR earlier if:
   - User taps Share → opens iOS share sheet, toast dismisses.
   - User swipes the toast down.
   - A new toast replaces it (newest wins, no stacking).
   - User navigates away.
   - App is backgrounded.

### Share tap (in toast)

- Opens iOS share sheet via existing `Share.share({ url: eventUrl })`.
- Existing PostHog `share_event_initiated` / `_completed` / `_dismissed` events fire with new `via: "save_toast"` dimension.

### Unsave tap (saved → unsaved)

- Button reverts to `♡ Save`.
- No toast. No haptic.
- Convex unfollow mutation runs in background.

### Already-saved event (no transition)

- Button shows `✓ Saved`. No toast — toasts only fire on the unsaved → saved transition.

### Save fails (mutation error)

- Local state reverts: button goes back to `♡ Save`.
- Success toast is replaced with an error toast: `✕  Couldn't save · Retry` (red variant, blue Retry action).
- PostHog logs the error.

### Offline

- Convex queues the mutation and retries on reconnect. UI shows "Saved" optimistically. If retries exhaust, error toast appears.

## Components

### `SaveButton` (replaces `SaveShareButton` and existing `SaveButton`)

**Path:** `apps/expo/src/components/SaveButton.tsx` (rewritten in place — replaces both the existing deprecated `SaveButton.tsx` and the active `SaveShareButton.tsx`).
**Old `SaveShareButton.tsx`:** Deleted. All call sites updated to import the new `SaveButton` and rely on the toast for the share path.

Single responsibility: render save state, call save action.

```tsx
interface SaveButtonProps {
  eventId: string;
  isSaved: boolean;     // initial value from query
  source: string;       // "event_detail" | "list_card" | "discover" | etc.
}
```

States:
- **Unsaved:** filled-heart icon + "Save" on `bg-interactive-2` (purple).
- **Saved:** check icon + "Saved" on translucent grey background, dark text. NOT disabled.

Behavior:
- Local `isSaved` state seeded from prop, toggled synchronously on tap.
- Light impact haptic only on save (not on unsave; unsave is silent per spec).
- Calls `useEventSaveActions().toggle(eventId)`.

Accessibility:
- Unsaved: `accessibilityLabel="Save"`.
- Saved: `accessibilityLabel="Saved, double-tap to remove"`.

### `SaveToast` (new, app-wide reusable toast)

**Path:** `apps/expo/src/components/Toast/index.tsx` (new).

Generic Mail-style banner usable by any feature. Single instance mounted at app root.

```tsx
interface ToastOptions {
  message: string;
  action?: { label: string; onPress: () => void };
  duration?: number;       // default 4000ms
  variant?: "success" | "error";  // default "success"
}

const toast = useToast();
toast.show({ message: "Saved to your list", action: { label: "Share", onPress: handleShare } });
```

Visual spec:
- Position: above tab bar / floating action area, 14pt from screen edges.
- Background: `rgba(242, 242, 247, 0.92)` with `backdrop-filter: blur(30px)` (iOS ultra-thin material).
- Border: `0.5px solid rgba(0,0,0,0.1)`.
- Corner radius: 14pt.
- Check icon: 22pt circle, `#34C759` (iOS system green), white check.
- Body text: 13pt, `#1C1C1E`, weight 500, letter-spacing -0.01em.
- Action text: 13pt, `#007AFF` (iOS system blue), weight 600.
- Padding: 12pt vertical, 14pt horizontal.
- Shadow: `0 10px 30px rgba(0,0,0,0.1)`.
- Error variant: red check (`#FF3B30`), retry action stays blue.

Behavior:
- Slides up from bottom (200ms ease-out).
- Auto-dismisses after `duration` (default 4000ms).
- Replaces any current toast (no stacking).
- Dismisses on: action tap, swipe down, route change, app backgrounding.
- Announces to VoiceOver via `AccessibilityInfo.announceForAccessibility`.

### `useEventSaveActions` hook (refactor existing)

**Path:** `apps/expo/src/hooks/useEventActions.ts` (existing file, refactor `useEventSaveActions` export).

```tsx
const { toggle, isSaved, isPending } = useEventSaveActions(eventId, initialIsSaved);
```

- `toggle()` flips local `isSaved` state synchronously, fires the mutation in the background.
- On save success: `toast.show({ message: "Saved to your list", action: { label: "Share", onPress: openShareSheet } })`.
- On save error: revert local state, `toast.show({ message: "Couldn't save", action: { label: "Retry", onPress: retry }, variant: "error" })`.
- On unsave success: no toast.
- On unsave error: revert state, error toast.

### Convex optimistic update — generalize

**Path:** `apps/expo/src/hooks/useEventActions.ts` (or wherever the current optimistic update is defined).

Rewrite the optimistic update to write directly to `eventFollows` keyed on `(userId, eventId)` rather than depending on `getSavedIdsForUser` being preloaded. This ensures cross-screen consistency without requiring any specific query to be warm.

## Data flow

```
[ Tap ]
    │
    ▼
useEventSaveActions.toggle()
    │
    ├── setIsSaved(true)         ◄── instant UI flip
    ├── Haptics.impact(Light)
    ├── toast.show({ ... })      ◄── instant toast
    │
    └── (async) followEventMutation
          │
          ├── success → no UI change (already optimistic)
          └── failure → revert state + show error toast
```

## Analytics

New / modified PostHog events:

| Event | When | Properties |
|---|---|---|
| `event_saved` (new) | Save tap succeeds | `event_id`, `source` |
| `event_unsaved` (new) | Unsave tap succeeds | `event_id`, `source` |
| `event_save_failed` (new) | Save mutation errors | `event_id`, `source`, `error_message` |
| `share_event_initiated` (existing, modified) | Share opens | adds `via: "save_toast" \| "event_detail" \| "event_card"` |
| `save_toast_share_clicked` (new) | User taps Share in toast | `event_id`, `source` |
| `save_toast_dismissed` (new) | Toast auto-dismisses without interaction | `event_id`, `source`, `duration_ms` |

## Performance target

Tap-to-visual-feedback under **50ms** (button state flip + toast slide-in start). Currently 200–800ms depending on network. Achieved by making local state authoritative for the optimistic UI rather than waiting on Convex query reactivity.

## Out of scope

- Web behavior (web SaveButton keeps current iOS deep-link logic).
- List picker / multi-list save during the save action (future C2).
- Owner-of-event Share button (unchanged).
- Android.
- Dynamic Island integration (future enhancement on top of the toast).
- The `SavedByModal` "Saved" vs "Captured this event" distinction (out of scope; copy is fine).
- Renaming the underlying data model (`eventFollows` table stays as-is).

## Edge cases

| Case | Behavior |
|---|---|
| Signed out + tap save | Existing sign-in flow (current behavior). |
| Two rapid taps (save then unsave) | Local state toggles correctly. Last-write-wins on the mutation. |
| Five rapid saves | Each fires its own toast; newest replaces oldest (no stack). |
| Toast up + navigate away | Toast dismisses on route change. |
| Toast up + app backgrounded | Toast dismisses. Not restored on relaunch. |
| Owner saves their own event | Impossible — owners see Share, not Save. |
| Save mutation fails | Revert state, show error toast with Retry. |
| Offline save | Convex queues, UI optimistic. Error toast if all retries exhaust. |

## Open questions

None at this time.
