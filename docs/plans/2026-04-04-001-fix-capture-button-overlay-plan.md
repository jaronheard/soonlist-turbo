---
title: "fix: Replace capture tab with overlay button to eliminate blank screen"
type: fix
status: completed
date: 2026-04-04
origin: docs/brainstorms/2026-04-03-capture-button-redesign-requirements.md
---

# fix: Replace capture tab with overlay button to eliminate blank screen

## Overview

The capture button is currently a `NativeTabs.Trigger` with `role="search"` that navigates to a blank placeholder screen (`apps/expo/src/app/(tabs)/add.tsx`). A `tabPress` listener launches the photo picker, and a timer navigates back to `/feed`. Because the tab and the action are out of sync, users sometimes land on the empty placeholder after picker cancellation or app cold-start.

This plan removes the capture entry from `NativeTabs` entirely, deletes the placeholder screen, and replaces it with a custom overlay button mounted at the root layout. The overlay renders above the native tab bar on `(tabs)` routes only, triggers the same `useAddEventFlow` hook directly, and cannot be navigated to — eliminating the blank screen by construction.

**Evidence note:** Bug frequency is not instrumented. It reproduces reliably after picker cancellation in dev, but there's no Sentry/PostHog data quantifying production impact. The plan accepts this uncertainty because (a) the fix also advances origin requirement R5 (stay on current tab after capture) which cannot be achieved by the simpler alternatives, and (b) revert cost is low (single git revert).

## Problem Frame

The Expo Router `NativeTabs` API (`expo-router/unstable-native-tabs`) cannot support a non-navigating tab: `canPreventDefault: false` on the `tabPress` event, and `onTabChange` unconditionally dispatches `JUMP_TO` after the listener runs. Any trigger added to `NativeTabs` is a real navigation destination.

The overlay uses a plain solid button (`Pressable` + NativeWind + the existing `capture-tab.png` icon) rather than any glass effect. The visual target is **the exact appearance of the current capture tab trigger in its pre-scroll-collapse state** — same icon, same apparent size, same apparent position within the tab bar row. No `@expo/ui/swift-ui`, no Liquid Glass button, no structural template from any existing in-repo component.

See origin: `docs/brainstorms/2026-04-03-capture-button-redesign-requirements.md`.

## Requirements Trace

- **R1.** Remove the `add` entry from `NativeTabs` entirely — no more navigating tab, no more blank screen (origin R1, R2)
- **R2.** Delete `apps/expo/src/app/(tabs)/add.tsx`; the unrelated `/add` modal route at `apps/expo/src/app/add.tsx` is untouched (origin R2)
- **R3.** Render a custom capture button as an overlay positioned near the current `role="search"` visual location. Exact position-matching not required (origin R3)
- **R4.** Press launches `ImagePicker.launchImageLibraryAsync()` via existing `useAddEventFlow` hook with unchanged configuration (origin R4)
- **R5.** After selection, user stays on the current tab. Existing `useCaptureCompletionFeedback` at the root layout already handles global completion banners (origin R5)
- **R6.** Preserve initial haptic feedback from `useAddEventFlow` (it already calls `Haptics.selectionAsync()` internally). Add an explicit double-tap guard inside the overlay — see Key Technical Decisions (origin R6; corrected — the `pickerActiveRef` referenced in the origin doc lives in `(tabs)/_layout.tsx`, not in `useAddEventFlow`, and is intentionally replaced)
- **R7.** Disable button when offline via `useNetworkStatus`, following the (unused) `AddEventButton` offline pattern (origin R7)
- **R8.** Continue using the system picker — no full photo library permission required (origin R8)

## Scope Boundaries

- **Not in scope:** Camera, link, or share extension capture methods
- **Not in scope:** Custom photo grid or permission dialogs
- **Not in scope:** Cleanup of unreachable `apps/expo/src/app/add.tsx` modal route or unused `apps/expo/src/components/AddEventButton.tsx` component (dead code, separate task)
- **Not in scope:** Matching scroll-collapse behavior — `minimizeBehavior` is a UIKit-level prop that only applies to native tab items and cannot be inherited by an RN overlay
- **Not in scope:** Android support — an in-flight PR (chore/remove-android-build-config) removes Android from the Expo build config entirely, confirming iOS-only as the project's active platform. The overlay is iOS-only to match

## Platform Fidelity Trade-off

This plan is framed as a reliability fix, but it is also a small regression in platform integration that deserves an explicit call:

- **Giving up:** Native iOS `role="search"` placement and scroll-collapse coordination with the tab bar (`minimizeBehavior`)
- **Gaining:** Blank screen elimination by construction, R5 (stay on current tab after capture), future extensibility for non-picker capture methods (camera/link/share extension) without shoehorning into a `tabPress` listener

The overlay is a plain RN `Pressable` rendering the existing `capture-tab.png` icon with styling chosen to match the tab's pre-collapse visual appearance. It does not use Liquid Glass, does not participate in the tab bar's scroll-collapse animation, and its position only approximates the `role="search"` placement. Origin requirement R3 explicitly accepts visual proximity over exact match.

## Alternatives Considered

Two simpler alternatives were evaluated during brainstorm and rejected in favor of the overlay approach.

**Alternative A: Replace `(tabs)/add.tsx` with `<Redirect href="/feed" />`**
- **Pros:** 3-line change. Preserves native `role="search"` Liquid Glass placement and scroll-collapse. Eliminates blank screen by construction.
- **Cons:** Does not advance origin R5 (stay on current tab after capture). The tab still navigates to `/add` and bounces back to `/feed`, so a user capturing from My Scene or Discover still lands on My Soonlist. The intent to extend capture beyond photo picker (camera, link, share extension) remains trapped inside a `tabPress` listener.
- **Why rejected:** Fails R5 and does not open the door to extensibility. The brainstorm explicitly prioritized both reliability AND the "stay on current tab" improvement.

**Alternative B: Remove the `setTimeout(..., 100)` delay on the post-capture `router.navigate("/feed")`**
- **Pros:** One-character change. Likely eliminates the bulk of the blank screen exposure window.
- **Cons:** Same as Alternative A plus it doesn't fix cold-start-to-add-route scenarios at all.
- **Why rejected:** Partial fix; same R5 limitation.

**Chosen: Overlay button mounted at root layout (this plan)**
- Fixes blank screen by making `/add` unreachable
- Achieves R5 (capture is an overlay action, not a tab navigation)
- Makes future capture method expansion a question of "what does `onPress` do?" rather than "how do we wire a new tabPress listener?"
- Accepts the platform fidelity regression documented above

## Context & Research

### Relevant Code and Patterns

- **`apps/expo/src/components/AddEventButton.tsx`** — Reference (unshipped). Offline handling via `useNetworkStatus`, `CircularSpinner` overlay driven by `useInFlightEventStore().isCapturing`, accessibility label patterns. Use as a reference for the offline branch and spinner approach — not as a visual template
- **`apps/expo/src/hooks/useAddEventFlow.ts`** — The nav-agnostic capture handler. Already fires `Haptics.selectionAsync()`, sets `isCapturing`, launches `ImagePicker.launchImageLibraryAsync`, creates events via `createMultipleEvents`. **Critical detail:** the hook does NOT read `isCapturing` as a guard — it only writes it. Concurrent callers can trigger overlapping flows unless the call site guards
- **`apps/expo/src/hooks/useNetworkStatus.ts`** — Returns `isOnline: boolean` via `@react-native-community/netinfo`
- **`apps/expo/src/store/useInFlightEventStore.ts`** — Exposes `isCapturing` for spinner overlay state
- **`apps/expo/src/app/_layout.tsx`** — `RootLayoutContent` wraps `<InitialLayout />` + `<StatusBar />` in `<View style={{ flex: 1 }}>`. **Already calls `const pathname = usePathname()`** on approximately line 334 — reuse `pathname` rather than introducing `useSegments` which is unused elsewhere in the repo
- **`apps/expo/src/app/(tabs)/_layout.tsx`** — Current NativeTabs config. Contains the `pickerActiveRef` guard (NOT in `useAddEventFlow`), the `tabPress` listener, the `setTimeout(router.navigate("/feed"), 100)` post-capture navigation, and `renderingMode` / icon config for the current capture tab. The current icon rendering is the visual target for the overlay
- **`apps/expo/src/app/(tabs)/add.tsx`** — 1-line placeholder returning `<View className="bg-interactive-3" />`. Deleted
- **`apps/expo/src/assets/capture-tab.png`** (`@1x/@2x/@3x`) — Current capture icon. Used directly by the overlay as an `<Image>` source
- **`apps/expo/AGENTS.md`** — Styling via NativeWind, animations via Reanimated, Zustand state, file-based routing

**Not a reference:** A previously-existing `apps/expo/src/components/GlassToolbar.tsx` sketch that appeared in early planning notes has been deleted from this branch. It never shipped and is not a valid template.

### Institutional Learnings

`docs/solutions/` does not exist in this repo. No prior learnings. Consider documenting the overlay pattern and its trade-offs in `apps/expo/AGENTS.md` after this ships.

### External References

External research skipped — local patterns are sufficient.

## Key Technical Decisions

- **Mount overlay at root layout (`_layout.tsx`), not inside `(tabs)/_layout.tsx`** — `NativeTabs` has no JSX child slot for overlays. Children of `NativeTabs` must be `NativeTabs.Trigger` elements. Mounting one level up in `RootLayoutContent` is the only place where an RN `<View>` can render above the native tab bar

- **Path gate via `usePathname()`, not `useSegments()`** — `RootLayoutContent` already calls `usePathname()` at approximately line 334. The repo has zero existing uses of `useSegments`. Reuse the existing pattern: check whether the current pathname belongs to a tab route (feed, following, discover) and hide otherwise. An explicit allowlist of tab pathnames is more predictable than segment-array inspection when modal routes are presented over tabs

- **Modal route visibility rule (decided, not deferred)** — Overlay hides whenever any route is stacked above `(tabs)`. Concretely: show only when `pathname` matches one of `/feed`, `/following`, `/discover` (exact or prefix match for nested routes within those tabs). Modal routes like `/event/[id]`, `/add` (the unrelated modal), `/[username]`, `/new`, settings subpages, paywall, and onboarding all produce a different `pathname` and therefore hide the overlay automatically. Rationale: event detail, profile sheets, and capture-completion screens are focused contexts where a floating capture button is distracting and risks accidental taps

- **Explicit double-tap guard inside `CaptureOverlayButton`** — `useAddEventFlow` does not read `isCapturing` as a guard, so concurrent presses could trigger overlapping flows. Add `if (isCapturing) return;` at the top of the overlay's `onPress` handler using the store selector. This replaces the `pickerActiveRef` ref from the old tab layout with a more explicit store-driven guard at the single call site

- **In-flight visual feedback** — When `useInFlightEventStore().isCapturing` is `true`, render a subtle loading state on the button (dimmed or with a small spinner overlay, following `AddEventButton`'s pattern). This bridges the gap between press and picker-modal-appears so users don't double-tap. When `isCapturing` returns to `false` and the picker is still active (iOS modal), no overlay feedback is needed because the picker itself is focus-stealing

- **Plain `Pressable` + NativeWind, no Liquid Glass** — The button is a plain RN `Pressable` wrapping an `<Image source={require(".../capture-tab.png")} />`. No `@expo/ui/swift-ui`, no `<GlassEffectContainer>`, no `<Host>`. Rationale: (a) the capture button does not need to be glass — the rest of the tab bar still is, and the overlay sits above it; (b) `@expo/ui/swift-ui` outside a `NativeTabs.Trigger` context is unvalidated; (c) simpler is more reliable; (d) the visual target is the current capture tab icon in its pre-scroll-collapse state, which is a plain tinted image, not a glass button

- **Visual target: match the current capture tab exactly (pre-scroll-collapse)** — During implementation, compare side-by-side with the current `NativeTabs.Trigger name="add" role="search"` rendering before scroll collapse. Match icon size, apparent position, tap feedback, and any subtle background treatment. The `capture-tab.png` asset is the same — only the containing element changes

- **Delete `(tabs)/add.tsx`, don't repurpose it** — The file only exists to satisfy `NativeTabs.Trigger name="add"`. Once the trigger is removed, the file has no reason to exist

- **`bottomOffset` starting guess: `32`** — Small offset above the safe area inset, placing the button roughly in line with the tab bar icon row. This is a starting guess, not a validated constant. Visual verification on-device against the current capture tab position is a blocking verification step (see Unit 1). Likely adjustment window is roughly `16`–`48`; if the right value is outside that range, measure the tab bar height directly rather than guessing

## Open Questions

### Resolved During Planning

- **Q: Where does the overlay mount?** — `RootLayoutContent` in `apps/expo/src/app/_layout.tsx`, sibling of `<InitialLayout />`, path-gated via `usePathname()`
- **Q: How is path gating implemented?** — Explicit allowlist of `/feed`, `/following`, `/discover` via `usePathname()`. Modal and non-tab routes automatically hide the overlay. Not `useSegments()`
- **Q: How are concurrent captures prevented without `pickerActiveRef`?** — Explicit `if (isCapturing) return` guard inside the overlay's `onPress` reading `useInFlightEventStore`
- **Q: Does the button show a loading state during capture?** — Yes. Dim/spinner following `AddEventButton` pattern, driven by `isCapturing`
- **Q: Does capture progress feedback need new work?** — No. `useCaptureCompletionFeedback` is already called at root layout and shows `EventCaptureBanner`/`BatchSummaryBanner` globally via `react-native-notifier`. Verification step added to Unit 3 confirms this works on non-feed tabs
- **Q: What about Android?** — iOS-only, consistent with the concurrent Android removal PR

### Deferred to Implementation

- **Exact `bottomOffset` and `right` values** — Starts at `32` and `16`. Must be visually verified against the current capture tab position (pre-scroll-collapse) on multiple device sizes. Adjust empirically; don't trust the starting guess
- **Exact tap-feedback treatment** — `Pressable` can apply opacity or scale on press. Match whatever the current `NativeTabs.Trigger` does on press (likely a subtle opacity dip). If that's hard to read directly, ship a subtle opacity dip (e.g., `{ opacity: 0.6 }` while pressed) as a starting point

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
apps/expo/src/app/_layout.tsx
└── RootLayoutContent
    ├── const pathname = usePathname()            ← already exists (~line 334)
    └── <View style={{flex:1}}>
        ├── <InitialLayout />                      ← Stack navigator (tabs, auth, onboarding, modals)
        │   └── (tabs)/_layout.tsx
        │       └── <NativeTabs>                   ← Native UIKit tab bar (no JSX siblings possible inside)
        │           ├── feed trigger
        │           ├── following trigger
        │           └── discover trigger           ← "add" trigger REMOVED
        │
        ├── <CaptureOverlayButton pathname={pathname} />  ← NEW
        │   ├── Allowlist gate: pathname in {/feed, /following, /discover} prefixes
        │   ├── Platform.OS === "ios" guard
        │   ├── useNetworkStatus() → offline branch (disabled)
        │   ├── useInFlightEventStore() → isCapturing drives spinner + onPress guard
        │   └── onPress → if (isCapturing) return; else triggerAddEventFlow()
        │
        └── <StatusBar />
```

Render order: `<CaptureOverlayButton />` is a later sibling than `<InitialLayout />` inside the same parent `View`, so React Native stacks it visually above the tab bar. `pointerEvents="box-none"` on the outer wrapper lets touches pass through empty space so the tab bar and screen content underneath remain interactive.

## Implementation Units

- [x] **Unit 1: Create `CaptureOverlayButton` component with path gating, offline state, and in-flight feedback**

**Goal:** Self-contained overlay component that owns all of its visibility logic, state reactions, and styling. Can be dropped into any layout position and Just Works.

**Requirements:** R3, R4, R6, R7

**Dependencies:** None (uses existing hooks, store, assets)

**Files:**
- Create: `apps/expo/src/components/CaptureOverlayButton.tsx`

**Approach:**
- Accept an optional `pathname` prop for path gating; if not provided, read `usePathname()` internally
- Path gate: return `null` when pathname does not match `/feed`, `/following`, or `/discover` (prefix match to include nested routes like `/feed/[...]`). Modal routes are excluded by construction
- Platform gate: return `null` when `Platform.OS !== "ios"`
- Network gate: read `useNetworkStatus()`. When offline, render a disabled visual variant (dimmed opacity) and skip `onPress`
- In-flight gate: read `useInFlightEventStore()` for `isCapturing`. When `true`, overlay a small `CircularSpinner` on top of the icon (following `AddEventButton`'s spinner pattern)
- `onPress` handler: `if (isCapturing) return;` then call `triggerAddEventFlow()` from `useAddEventFlow()`
- **Structure (plain `Pressable`, not Liquid Glass):**
  - Outer `<View>` with `position: "absolute"`, `pointerEvents="box-none"`, inline `bottom: bottomOffset + insets.bottom` using `useSafeAreaInsets()`, `right: 16`, `zIndex: 100`
  - Inside: `<Pressable>` wrapping `<Image source={require("../assets/capture-tab.png")} />`
  - Pressable hit target is at least 44×44pt — pad the Pressable if the image alone is smaller
  - Subtle press feedback via `({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })` as a starting point; adjust to match current tab press feel if visibly different
  - No background container, no border, no glass effect — the icon on top of whatever is beneath it, matching the current tab bar icon rendering
- **Visual target:** exact appearance of the current `NativeTabs.Trigger name="add" role="search"` in its pre-scroll-collapse state. Same icon asset, same apparent size, same apparent position. Side-by-side comparison during Unit 1 verification (screenshot before changes, screenshot after, overlay in Figma or similar)
- **Accessibility (required):**
  - `accessibilityLabel="Capture event from photos"`
  - `accessibilityHint="Opens photo picker to create an event"`
  - `accessibilityRole="button"`
  - When offline: `accessibilityState={{ disabled: true }}`, label becomes `"Capture event from photos (offline)"`
  - When capturing: `accessibilityState={{ busy: true }}`
  - Minimum hit target 44×44pt per Apple HIG
- Positioning defaults (tunable): `right: 16`, `bottom: 32 + insets.bottom`, `zIndex: 100`. Expose as optional props

**Patterns to follow:**
- `apps/expo/src/components/AddEventButton.tsx` — offline branch, `CircularSpinner` for `isCapturing`, accessibility labeling (reference only; do not copy its visual treatment)
- `apps/expo/AGENTS.md` — NativeWind + inline styles for dynamic values
- `apps/expo/src/app/(tabs)/_layout.tsx` — current capture tab trigger configuration (the visual target to match)

**Test scenarios:**
- Happy path: On `/feed` with network, pressing the button fires `triggerAddEventFlow` exactly once and the picker opens
- Happy path: On `/following` and `/discover`, same behavior as feed
- Edge case — path gating: on `/event/[id]`, `/(onboarding)/*`, `/(auth)/*`, `/add` modal, settings modals, paywall, the component returns `null`
- Edge case — offline: `useNetworkStatus()` returns `false` → button renders disabled, `onPress` does not fire
- Edge case — in-flight: `isCapturing` is `true` → button shows spinner, `onPress` early-returns without calling `triggerAddEventFlow` again
- Edge case — double-tap: rapid repeated taps do not open multiple pickers or create duplicate events
- Edge case — Android: component returns `null`, no crash
- Edge case — picker cancel: press button, cancel picker, press button again → second press succeeds (no stale `isCapturing` flag)
- Integration: while on `/following`, press capture, pick photos, cancel picker → stay on `/following`, no navigation away, no errors
- Integration — VoiceOver: VoiceOver reads the button's label, hint, and state correctly in each mode (idle/offline/busy)

**Verification:**
- `pnpm check` passes (typecheck + lint)
- **Visual parity check (blocking):** take a screenshot of the app on the feed tab BEFORE any changes (baseline: current `role="search"` capture tab in pre-scroll-collapse state). After Unit 1 + Unit 2, take the same screenshot. The capture icon's center position should match within ±4pt both horizontally and vertically. If it doesn't, tune `bottomOffset` (`right` should stay at `16`). If the adjustment required is outside roughly `16`–`48`, stop and measure the tab bar height directly instead of guessing
- On-device on iPhone 15 (standard), iPhone 15 Pro Max (tall), iPhone SE 3rd gen (short, no Dynamic Island):
  - Visual parity check above passes on each device
  - No overlap with any tab trigger hit area
  - Offline visual state is clearly distinguishable from idle
  - In-flight spinner is visible but not obnoxious
  - Press feedback (opacity dip) feels equivalent to the current tab press
  - VoiceOver smoke test: all three states (idle/offline/busy) read correctly
- At AX5 Dynamic Type setting, button does not overlap the enlarged tab bar (if it does, bump `bottomOffset` or read tab bar height dynamically)

---

- [x] **Unit 2: Mount overlay in root layout**

**Goal:** Render `CaptureOverlayButton` at root so it appears above the native tab bar on tab routes.

**Requirements:** R1, R3, R5

**Dependencies:** Unit 1 (component must exist and own its own gating)

**Files:**
- Modify: `apps/expo/src/app/_layout.tsx`

**Approach:**
- Inside `RootLayoutContent` (approximately line 327), add `<CaptureOverlayButton />` as a sibling after `<InitialLayout />` and before `<StatusBar />` inside the wrapper `<View style={{ flex: 1 }}>`
- The component reads `usePathname()` internally — no props needed from the layout. Mount point stays dumb: one line of JSX
- `RootLayoutContent` is already nested inside `ClerkProvider`, `ConvexProviderWithClerk`, and `QueryClientProvider`, so `useAddEventFlow`, `useUser`, and Convex hooks all work automatically

**Patterns to follow:**
- Existing `<StatusBar />` placement as a sibling of `<InitialLayout />`
- Existing `usePathname()` call already in `RootLayoutContent`

**Test scenarios:**
- Happy path: Cold-start the app to a tab route → overlay is visible
- Happy path: Navigate between `/feed` → `/following` → `/discover` → overlay stays visible, no flicker
- Edge case: Cold-start to `/(auth)/sign-in` → overlay is hidden
- Edge case: Cold-start to `/(onboarding)/*` → overlay is hidden
- Edge case: From feed, push `/event/[id]` modal → overlay hides during transition and stays hidden while modal is on top
- Edge case: Dismiss modal back to `/feed` → overlay reappears without flicker
- Edge case: From feed, tap a profile `/[username]` → overlay hides (it's a stack push, not a tab)
- Integration: Full capture flow from each tab (feed, following, discover): press overlay → pick photos → stay on origin tab → completion banner appears

**Verification:**
- Overlay visible only on `/feed`, `/following`, `/discover` (and nested routes under them)
- Hidden on all other routes including modals presented over tabs
- No layout shift or scroll-gesture interference inside tab content
- Completion banner (`EventCaptureBanner`/`BatchSummaryBanner`) appears correctly regardless of which tab initiated the capture — confirm during on-device integration test

---

- [x] **Unit 3: Remove `add` tab from NativeTabs and delete placeholder screen**

**Goal:** Remove the broken `NativeTabs.Trigger` for capture and its related machinery, then delete the empty placeholder screen file.

**Requirements:** R1, R2

**Dependencies:** Units 1 and 2 must be in place and working — otherwise removing the tab would temporarily leave the user with no capture entry point

**Files:**
- Modify: `apps/expo/src/app/(tabs)/_layout.tsx`
- Delete: `apps/expo/src/app/(tabs)/add.tsx`

**Approach:**
- In `(tabs)/_layout.tsx`, delete:
  - The `<NativeTabs.Trigger name="add" role="search">` block (including its `listeners={{ tabPress }}`, label, and icon)
  - The `pickerActiveRef` (a `useRef` at the top of the component — this is the one the origin doc referred to; it lived here, not in `useAddEventFlow`)
  - The `triggerAddEventFlow` call inside `tabPress`
  - The `setTimeout(() => router.navigate("/feed"), 100)` post-capture navigation
  - Any now-unused imports: `useRef`, `useAddEventFlow`, `router` (if not used elsewhere in the file)
- Delete `apps/expo/src/app/(tabs)/add.tsx` entirely. Expo Router's file-based routing will automatically drop the route once both the trigger and file are gone
- Do not touch `apps/expo/src/app/add.tsx` (unrelated modal route) or `apps/expo/src/components/AddEventButton.tsx` (dead code) — those are tracked separately per scope boundaries
- Leave other triggers (feed, following, discover) unchanged, including `blurEffect`, `minimizeBehavior`, and tint color on the `<NativeTabs>` root

**Patterns to follow:**
- Existing clean `NativeTabs.Trigger` definitions for feed/following as the reference shape after removal

**Test scenarios:**
- Happy path: App launches, tab bar shows only feed/following/discover triggers. Overlay button from Units 1+2 is present and functional
- Edge case: No blank screen is reachable under any navigation path. Attempt to deep-link to `/(tabs)/add` — Expo Router should return a 404-equivalent or redirect
- Edge case: Cold-start the app while previously on the removed `add` route (if any saved state points there) — app recovers cleanly to a valid tab
- Edge case — completion banner from non-feed tabs: start on `/following`, press overlay, pick photos, stay on `/following`, confirm `EventCaptureBanner` or `BatchSummaryBanner` appears. Repeat from `/discover`. If banners are coupled to `/feed` and don't surface elsewhere, file a follow-up to un-scope them
- Integration: Full capture flow from each remaining tab (happy path + cancel path + error path from permission denial)

**Verification:**
- `apps/expo/src/app/(tabs)/add.tsx` no longer exists
- `(tabs)/_layout.tsx` has no reference to `name="add"`, `pickerActiveRef`, or post-capture navigation
- TypeScript + lint pass: `pnpm lint:fix && pnpm check` in the repo root
- Manual on-device: no blank screen under any app lifecycle (cold start, background/foreground, picker cancel, picker success)
- Maestro smoke tests still pass: `pnpm test` at the repo root runs the existing `.maestro/local/` flows (auth, onboarding, signed_in) without regression

## System-Wide Impact

- **Interaction graph:** `useAddEventFlow` is also called from `apps/expo/src/components/UserEventsList.tsx` (empty-state CTAs). This plan does not touch those call sites — they continue working since `triggerAddEventFlow` is unchanged. Note: those call sites do NOT have a double-tap guard either; if concurrent-capture issues are observed, consider moving the `isCapturing` guard inside `useAddEventFlow` itself as a follow-up
- **Error propagation:** `useAddEventFlow` already handles picker cancellation, permission denial, and event creation failure with toasts via `react-native-notifier`. No new error paths introduced
- **State lifecycle:** The explicit `isCapturing` guard in the overlay's `onPress` replaces the `pickerActiveRef` from the tab layout. It's a stricter guarantee because it reads live store state rather than a local ref, which means it also guards against the case where a capture is triggered from `UserEventsList`'s CTA and then the user taps the overlay before that capture completes
- **API surface parity:** None — purely internal UI change
- **Integration coverage:** Post-capture completion feedback via `useCaptureCompletionFeedback` at root layout. Verify during Unit 3 that banners surface on non-feed tabs — this is a concrete verification step, not an assumption
- **Unchanged invariants:** `useAddEventFlow`, `useInFlightEventStore`, `useCaptureCompletionFeedback`, `EventCaptureBanner`, `BatchSummaryBanner`, and all non-`add` tabs in `(tabs)/_layout.tsx` behave identically before and after

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `bottomOffset = 32` starting guess doesn't visually align with the current capture tab position | Visual parity check against a pre-change screenshot is a blocking Unit 1 step. Tune empirically. If adjustment is outside `16`–`48`, measure tab bar height directly |
| Path gating misses a modal route (paywall, onboarding variants, deep-linked screens) and the overlay floats over content | Explicit allowlist of `/feed`, `/following`, `/discover` prefixes is more predictable than inspecting segment arrays. Enumerate every presentation mode during Unit 2 test scenarios |
| Completion banners were coupled to the forced `/feed` navigation and don't actually surface on other tabs | Concrete verification step in Unit 3 (integration scenario). If they don't surface, file a follow-up — the un-coupling is mechanical |
| Dynamic Type at AX5 grows the tab bar past the hardcoded offset | Verification step tests AX5 explicitly. If broken, read tab bar height dynamically or bump the offset |
| Removing `pickerActiveRef` reintroduces a race | Replaced with explicit `isCapturing` guard inside the overlay's `onPress`. Stricter than the ref because it reads live store state |
| `expo-router/unstable-native-tabs` API changes between preview and stable | Pre-existing risk. Removing one trigger doesn't increase exposure |
| Plain `Pressable` + `<Image>` doesn't fully match the iOS tab bar's native press feel (haptic/visual) | Low visual difference in practice; matches current `NativeTabs.Trigger` tap behavior closely. If the gap is noticeable, add `Haptics.selectionAsync()` on press — but `useAddEventFlow` already does this at the start of the capture flow, so a second haptic would be redundant |

## Documentation / Operational Notes

- After landing, add a note to `apps/expo/AGENTS.md` about the overlay pattern with this framing: *"Overlay at root layout is a last-resort pattern for UI that cannot live inside a `NativeTabs.Trigger` and cannot live inside a screen. Prefer (1) a screen-level component, (2) a `NativeTabs.Trigger`, (3) a modal route, before reaching for a root-layout overlay. Each root overlay adds z-order, touch-routing, and path-gating complexity."* — this keeps the escape hatch available without making it the default
- No user-facing docs to update
- No feature flag needed — small, contained, single-revert rollback

## Sources & References

- **Origin document:** `docs/brainstorms/2026-04-03-capture-button-redesign-requirements.md`
- Related code:
  - `apps/expo/src/components/AddEventButton.tsx` (offline + spinner + a11y reference only, unshipped)
  - `apps/expo/src/hooks/useAddEventFlow.ts` (capture handler)
  - `apps/expo/src/hooks/useNetworkStatus.ts` (offline hook)
  - `apps/expo/src/store/useInFlightEventStore.ts` (isCapturing state)
  - `apps/expo/src/app/_layout.tsx` (mount point, already has `usePathname`)
  - `apps/expo/src/app/(tabs)/_layout.tsx` (tab removal target, `pickerActiveRef` location, current capture tab visual target)
  - `apps/expo/src/assets/capture-tab.png` (icon asset)
- Related PRs:
  - `chore/remove-android-build-config` — #958 — confirms iOS-only scope
- Related cleanup on this branch: `apps/expo/src/components/GlassToolbar.tsx` deleted (never shipped, never imported)
