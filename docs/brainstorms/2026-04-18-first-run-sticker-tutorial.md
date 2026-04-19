# First-run tutorial: hand-drawn sticker arrows

**Date:** 2026-04-18
**Issue:** [#1010](https://github.com/jaronheard/soonlist-turbo/issues/1010)
**Parent context:** [#1005](https://github.com/jaronheard/soonlist-turbo/issues/1005) onboarding polish; Granola meeting *Soonlist onboarding flow user experience review* (2026-04-18).

## Intent

Teach first-run users the core loop — **subscribe → save → open** — with three hand-drawn marker-style sticker arrows placed inside the onboarding modal flow (not the real app screens).

Narrow-scoped: three stickers, two onboarding screens, no reusable tooltip framework, no post-onboarding behavior, no journey restructure beyond light edits to the two screens that host the stickers.

## Scope summary

Changes to the existing onboarding flow:

1. `01-try-it.tsx` (the "result" phase) — add a **Save sticker** pointing at the Save heart on the captured demo event.
2. `02-your-list.tsx` — rename to a "Meet a Soonlist" framing, add a demo **Subscribe** button, add a **phase transition** from *pre-subscribe* → *post-subscribe*, add a **Subscribe sticker** (phase A) and an **Open-it-up sticker** (phase B).

No changes to real app screens (feed, list detail, event detail).

## Visual style

- **Stroke:** bold solid marker, ~3.5pt weight, single clean line (no double-stroke/crayon texture).
- **Color:** warm accent — red-ish (`#FF4D4D` starting point, to be refined against the `interactive-1` purple background for contrast).
- **Caption font:** Kalam (or similar hand-drawn sans), weight 700, slight rotation (~−6°), hand-rendered not OS-system.
- **Arrow + caption layout:** arrow is an inline SVG path with a chunky arrowhead; caption sits alongside at a complementary angle; small × glyph at caption's end signals dismissibility.
- **Shadow / legibility:** subtle white text-shadow under the caption to keep it legible against the purple onboarding background.
- **Entrance:** fade-in over ~400ms with a tiny rotate wobble at rest (e.g., ±1° over 3s) — playful, not distracting.

## Behavior model

Because stickers live inside the onboarding modal flow, the cross-session / behavioral-trigger model is not needed. Simplifies to:

- **Trigger:** the sticker is mounted when its parent screen (or phase) is mounted.
- **Dismiss:** user taps the sticker body or the small × — sticker fades out; local state on the screen tracks "dismissed for this run."
- **Completion:** the underlying action (tapping Save heart, Subscribe button, event card) also dismisses the sticker. In phase A of screen 02, tapping Subscribe additionally transitions to phase B.
- **Persistence across sessions:** none needed. Onboarding only runs once (`hasCompletedOnboarding`). If a user re-enters onboarding (e.g., dev reset), stickers re-appear — that's acceptable.
- **Non-blocking:** Continue button is always usable regardless of sticker state. A user who ignores the sticker and taps Continue proceeds normally.

## Screen-by-screen spec

### Screen 01 `01-try-it.tsx` (phase: `result`)

**Current state:** title "That's it!", single `UserEventListItem` for Lloyd Mall Crawl with `isSaved={false}`, Continue button.

**Change:**
- Mount a `<SaveSticker />` inside the result phase, positioned relative to the event row so the arrow tip lands near the Save heart (top-right of the card).
- The existing Save heart remains functional in demo mode (tapping it marks the local demo event as saved and dismisses the sticker).

**Caption:** "save it!"

### Screen 02 `02-your-list.tsx` (reframe + phase-ify)

**Current state:** title "Meet your Soonlist", subtitle "All in one place. Share with just a link.", fake frame showing `soonlist.com/you` URL bar, `UserEventsList` with three demo events, Continue button.

**Changes — framing:**
- Title: "Meet your Soonlist" → **"Meet a Soonlist"**.
- Subtitle: to be rewritten to match the new framing (e.g., *"Subscribe to follow a curator's events"*). Exact copy deferred to implementation PR review.
- URL bar: `soonlist.com/you` → a demo curator handle (e.g., `soonlist.com/portland`). Chosen to match the Portland-area demo events already on screen.

**Changes — layout:**
- Add a demo **Subscribe** button inside the fake frame, positioned below the URL bar and above the event list, visually consistent with the real `SubscribeButton` on `list/[slug].tsx`. Demo-only — tapping it updates local phase state and does not hit the server. The outer Continue button remains in its current position below the fake frame.

**Changes — phases:**
Introduce local `phase` state (`'meet'` → `'subscribed'`), mirroring the pattern already used by `01-try-it.tsx`:

- **Phase A (`meet`):**
  - Subscribe button reads "Subscribe" / "+ Subscribe".
  - `<SubscribeSticker />` points at the Subscribe button.
  - URL bar shows no subscribed indicator.
- **Phase B (`subscribed`):**
  - Subscribe button reads "Subscribed ✓" (disabled or transitioned into a confirmation row).
  - URL bar shows a small "subscribed" pill next to the share icon.
  - Title changes to "Subscribed ✓" (or subtitle changes — exact placement decided during implementation); subtitle updates to *"Tap any event to see details"* or similar.
  - `<SubscribeSticker />` is unmounted.
  - `<EventDetailSticker />` mounts on the first event in the list (Lloyd Mall Crawl, maintaining continuity with screen 01).

**Phase transitions:**
- `'meet'` → `'subscribed'` when the user taps the demo Subscribe button.
- No transition from `'subscribed'` back to `'meet'`.

**Captions:**
- Subscribe sticker: "start here!"
- Open-it-up sticker: "open it up!"

## Component architecture

Per approach **A2** (one primitive + thin wrappers):

```
apps/expo/src/components/onboarding-stickers/
├── Sticker.tsx              // primitive: SVG arrow + caption + × + fade/wobble
├── SaveSticker.tsx          // wrapper: id, caption, orientation, anchor offsets
├── SubscribeSticker.tsx     // wrapper
├── EventDetailSticker.tsx   // wrapper
└── index.ts
```

**`<Sticker>` props:**
- `caption: string`
- `orientation: 'down-left' | 'down-right' | 'up-left' | 'up-right'` — controls arrow path + arrowhead direction + caption side.
- `offset: { x: number; y: number }` — pixel offset from the parent anchor element.
- `onDismiss?: () => void` — called on tap-to-dismiss; parent screen uses this to update local dismissed state if desired (for onboarding, dismissal is usually just component-local).
- Optional visual overrides (color, rotation) deferred unless they become needed.

**Anchoring:** because layouts are static in onboarding, stickers are absolutely-positioned children of known layout containers. No measured refs, no portals. The `<Sticker>` accepts an `anchorSlot` (one of a handful of named positions like `"event-row-save"`, `"subscribe-button-top"`) and the wrapper components compute the appropriate `offset` for the given screen's layout. If future refactors move anchors, the spec's anchor names stay stable; only offsets change.

**Tap-to-dismiss:** the whole sticker (arrow + caption + ×) is wrapped in a `Pressable` that sets a local `dismissed` state and triggers a fade-out animation.

## State & persistence

- **No global store changes.** Sticker visibility is local to each onboarding screen component.
- **No Convex writes.** Stickers do not sync to the backend.
- **No AsyncStorage / MMKV.** Cross-session persistence is not required — onboarding itself gates re-entry.

## Acceptance criteria

1. A user going through onboarding for the first time sees, in sequence:
   - Screen 01 `result`: Save heart with "save it!" sticker. Tapping the heart dismisses the sticker; tapping the sticker (or ×) also dismisses it. Continue always works.
   - Screen 02 phase A: Subscribe button with "start here!" sticker. Tapping Subscribe transitions to phase B and dismisses the sticker. Tapping the sticker (or ×) dismisses it but does not transition phases. Continue always works.
   - Screen 02 phase B: Open-it-up sticker on the first event. Tapping the event card dismisses the sticker (no actual navigation — demo only). Tapping the sticker (or ×) dismisses it. Continue always works.
2. Screen 02's title reads "Meet a Soonlist"; URL bar reads a demo curator handle, not `soonlist.com/you`.
3. All three stickers use the same visual language (marker stroke, red-ish color, Kalam caption, × glyph) and differ only by orientation / caption / anchor.
4. Stickers are never shown outside the onboarding flow. Returning users (with `hasCompletedOnboarding = true`) never see them.
5. Each sticker is positioned **next to** (not over) its target affordance. Taps on the Save heart, Subscribe button, or event card always hit the target, never the sticker. Tapping the sticker's own arrow/caption/× dismisses the sticker without triggering the target's action.
6. VoiceOver: each sticker exposes its caption as the accessibility label and announces itself as a hint. The ×-icon has an independent "Dismiss" accessibility action. The target affordances retain their own accessibility labels unchanged.

## Out of scope (restated)

- Stickers on real app screens (feed, list detail, event detail).
- Cross-session persistence / re-appearance based on user behavior.
- Lottie animations or hand-drawn PNG assets.
- A reusable coach-mark / tooltip framework.
- Featured Lists screen changes ([#1009](https://github.com/jaronheard/soonlist-turbo/issues/1009)).
- Paywall, sign-in, notifications screens.

## Open questions (for implementation plan)

1. **Exact subtitle copy** for screen 02 phase A and phase B — defer to implementation PR review.
2. **Exact demo curator handle** on the URL bar (e.g., `soonlist.com/portland` vs. something specific) — defer to content decision during implementation.
3. **Demo Save heart interaction on screen 01** — does tapping it visually mark the event as saved (filled heart) and also dismiss the sticker, or does it only dismiss? Implementation plan should choose; default is "fill the heart + dismiss."
4. **Accessibility announcement** when a sticker's phase transition occurs (e.g., VoiceOver focus moves to the new sticker after Subscribe) — implementation plan to decide focus management.
5. **Color contrast** — red-ish (`#FF4D4D`) against the `interactive-1` purple background needs a WCAG check during implementation; may shift to a slightly different warm hue.

## Related

- Granola meeting 2026-04-18 — *Soonlist onboarding flow user experience review*: source of the "Meet a Soonlist" copy shift and the tutorial-element intent.
- Parent issue [#1005](https://github.com/jaronheard/soonlist-turbo/issues/1005) — onboarding polish.
- Sibling issue [#1009](https://github.com/jaronheard/soonlist-turbo/issues/1009) — Featured Lists (upstream of this tutorial in the journey).
