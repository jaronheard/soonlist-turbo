# Share Prompt Timing: 3-Event Gate

**Issue**: [#1011](https://github.com/jaronheard/soonlist-turbo/issues/1011)
**Status**: Design approved, ready for implementation plan
**Date**: 2026-04-18

## 1. Intent & Scope

Gate app-initiated prompts to share a user's Soon List on upcoming-event count, so the app never suggests sharing a list that would land hollow for the recipient. Threshold is 3 upcoming events.

The rule applies only to **proactive** surfaces — UI the app shows the user without their asking. Manual share paths (the user tapping Share themselves) stay unrestricted; if someone wants to share a 1-event list, they can.

This issue ships independently of [#1007](https://github.com/jaronheard/soonlist-turbo/issues/1007) (first-share privacy + profile setup) via a minimal shell bottom sheet. #1007 later slots its setup content into the same trigger point without changing the gate.

## 2. Eligibility Rule

**Counter**: `upcomingEventCount` on the current user's own list — events the user owns with `startDate >= now`. Already computed on the profile page ([`[username]/index.tsx:225`](../../../apps/expo/src/app/[username]/index.tsx)) and via `enrichedEvents.length` on the feed ([`feed/index.tsx:185`](../../../apps/expo/src/app/(tabs)/feed/index.tsx)).

**Threshold**: `upcomingEventCount >= 3`.

**Reactivity**: eligibility can flip true → false → true as events pass or get added. The pill reflects current eligibility on every render. This matches the counter semantics — a list with 2 upcoming events isn't shareable in either direction.

**One-shot flag**: `hasSeenShareListPrompt: boolean`, persisted in `useAppStore`, does not reset when eligibility drops.

## 3. Surfaces

### 3.1 Pill transformation (persistent soft prompt)

[`UserEventsList.tsx:838 ScreenshotCta`](../../../apps/expo/src/components/UserEventsList.tsx) — same component, conditional content based on current eligibility:

| Eligibility | Text | Action |
| --- | --- | --- |
| `upcomingEventCount < 3` | "Screenshot events →" | Routes to add-event flow (unchanged) |
| `upcomingEventCount >= 3` | "Share your Soon List →" | Routes to `shareOwnList` |

Reactive: flips back to "Screenshot events →" if count drops below 3.

The top pill `SourceStickersRow` ([`UserEventsList.tsx:802`](../../../apps/expo/src/components/UserEventsList.tsx)) stays as-is — it's the empty-state prompt, not reached with 3+ events.

### 3.2 One-shot bottom sheet (threshold-crossing moment)

Fires exactly once per user when:

- Eligibility transitions `false → true`, AND
- `hasSeenShareListPrompt` is `false`, AND
- The user is not in onboarding, AND
- A save batch is not in progress (wait for batch to settle).

Shell content (this issue):

- **Title**: "Your Soon List is ready to share"
- **Body**: one-line description of what sharing does — sample shell copy: "Send your upcoming events to friends." Final copy owned by #1007.
- **Primary**: "Share" → calls `shareOwnList`, sets `hasSeenShareListPrompt = true`
- **Secondary**: "Not now" → dismisses, sets `hasSeenShareListPrompt = true`
- **Swipe-down dismiss**: also sets `hasSeenShareListPrompt = true`

**Handoff to #1007**: #1007 swaps the body contents for its privacy + profile setup. The trigger, gate, and one-shot flag remain the same.

### 3.3 Trigger timing rules

- **Batch saves**: only fire after the batch fully settles. Reuse existing batch-complete signal from the batch flow ([`batch/[batchId]/index.tsx`](../../../apps/expo/src/app/batch/[batchId]/index.tsx)).
- **iOS Share Extension saves**: defer eligibility/trigger evaluation to next app foreground — the extension cannot present the sheet.
- **Onboarding**: suppress entirely while onboarding screens are mounted.

### 3.4 Deferred surfaces (same gate when built, not in scope here)

- Push notifications encouraging share
- Onboarding completion tail suggesting share

## 4. State & Lifecycle

### Persisted state (Zustand `useAppStore`)

```ts
hasSeenShareListPrompt: boolean; // defaults false
setShareListPromptSeen: () => void;
```

Pattern mirrors existing flags like `hasShownRatingPrompt`.

### Shared hook `useShareListPrompt(upcomingEventCount)`

Mirrors [`useRatingPrompt.ts`](../../../apps/expo/src/hooks/useRatingPrompt.ts).

```ts
function useShareListPrompt(upcomingEventCount: number) {
  return {
    isShareEligible: boolean,    // upcomingEventCount >= 3
    shouldShowOneShot: boolean,  // transition + flag + not-onboarding + not-mid-batch
    markOneShotSeen: () => void, // sets hasSeenShareListPrompt = true
  };
}
```

- Pill consumes `isShareEligible` directly.
- Feed screen watches `shouldShowOneShot` and mounts the sheet.
- `markOneShotSeen` called on any dismissal path (Share, Not now, swipe).

### Edge cases

| Case | Behavior |
| --- | --- |
| Batch save crosses threshold mid-batch | Wait for batch settle, then evaluate once |
| Share Extension save crosses threshold | Evaluate on next app foreground |
| Count drops below 3 after one-shot seen | Pill reverts to "Screenshot events →"; sheet stays suppressed (flag is true) |
| User shares manually before ever eligible | Flag stays false; sheet still fires once on eventual crossing (acceptable — they may have shared a different way) |
| User uninstalls/reinstalls | Flag resets; sheet can fire again — acceptable |

## 5. Share Action

`shareOwnList` — a reusable function scoped to **the current user's own Soon List** (not to be confused with `handleShareList` in [`FollowedListsModal.tsx:56`](../../../apps/expo/src/components/FollowedListsModal.tsx) and [`following/index.tsx:471`](../../../apps/expo/src/app/(tabs)/following/index.tsx), which share *followed* lists). Extracted from the pattern at [`settings/account.tsx:355 handleSharePublicList`](../../../apps/expo/src/app/settings/account.tsx). Called by:

- Pill (eligible state)
- One-shot bottom sheet's Share button
- Header Share (manual)
- List-detail Share (manual)
- Settings "Share public list" (manual)

Single code path means #1007 can upgrade the behavior (first-share privacy + profile setup) in one place.

## 6. Analytics

| Event | Fires when | Props |
| --- | --- | --- |
| `share_prompt_eligibility_crossed` | First false → true transition per user | `upcomingEventCount` |
| `share_prompt_one_shot_shown` | Sheet mounted | `upcomingEventCount` |
| `share_prompt_one_shot_dismissed` | Sheet closed without sharing | `method: "not_now_button" \| "swipe"` |
| `share_prompt_one_shot_share_tapped` | Sheet's Share tapped | — |
| `share_prompt_pill_impression` | Debounced: once per feed session in eligible state | `upcomingEventCount` |
| `share_prompt_pill_tapped` | Pill tap in eligible state | — |
| `share_list_initiated` | `shareOwnList` called | `source: "pill" \| "one_shot_sheet" \| "header" \| "settings" \| "list_detail"` |
| `share_list_completed` | Native share sheet reports success | `source` (same values) |

Answers: threshold distribution, sheet engagement, pill engagement, funnel to completed share.

## 7. Out of Scope

- Manual share paths remain unchanged (Section 1 confirmed)
- Single-event sharing
- Push notifications encouraging share (deferred; same gate when built)
- Onboarding completion tail suggesting share (deferred; same gate when built)
- Rich link preview / OpenGraph — [#1012](https://github.com/jaronheard/soonlist-turbo/issues/1012)
- Privacy + profile setup content inside the bottom sheet — [#1007](https://github.com/jaronheard/soonlist-turbo/issues/1007)
- Threshold tuning beyond 3 — defer until PostHog distributions are in
- Gating manual share paths (confirmed not wanted)

## 8. Open Items

None. The open question from the issue (counter definition) was resolved in favor of upcoming-events-on-own-list (Section 2).
