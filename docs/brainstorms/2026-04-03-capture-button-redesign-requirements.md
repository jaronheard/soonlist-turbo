---
date: 2026-04-04
topic: capture-button-redesign
---

# Capture Button Redesign

## Problem Frame

The capture button in the tab bar is implemented as a `NativeTabs.Trigger` with `role="search"` that navigates to an empty screen (`apps/expo/src/app/(tabs)/add.tsx`). The actual photo picker is launched from a `tabPress` listener. Because a tab is a navigation destination but capture is an action, the two get out of sync — users sometimes land on a blank screen when the photo picker dismisses or the app reopens. This is the app's primary capture entry point, so reliability is critical.

A codebase check confirmed that Expo Router's `NativeTabs` API cannot support a non-navigating tab trigger: `canPreventDefault: false` on the `tabPress` event and `onTabChange` unconditionally dispatches `JUMP_TO` after the listener runs. A non-tab solution is therefore required.

## Requirements

**Core Change**
- R1. Remove the `add` entry from `NativeTabs` entirely — no more navigating tab, no more blank screen
- R2. Delete the `(tabs)/add.tsx` tab screen file. The unrelated `/add` modal route at `src/app/add.tsx` is out of scope (confirmed unreachable dead code, tracked separately)
- R3. Render a custom capture button as an overlay positioned over the native tab bar in approximately the same visual location as the current `role="search"` position. Exact position-matching to iOS Liquid Glass search placement is not required — visual proximity is enough

**Behavior**
- R4. On press, launch the system photo picker via `ImagePicker.launchImageLibraryAsync()` with the same configuration (multi-select, up to 20 images, 0.8 quality)
- R5. After photo selection, stay on the current tab instead of force-navigating to `/feed`. Post-capture progress and completion feedback is already handled globally by `useCaptureCompletionFeedback` at the root layout, which shows `EventCaptureBanner`/`BatchSummaryBanner` via `react-native-notifier` on any tab — no additional work needed
- R6. Preserve existing safeguards in `useAddEventFlow`: the `pickerActiveRef` double-open guard and the initial haptic feedback call
- R7. Disable the capture button when offline, following the pattern from the (unused) `AddEventButton` component

**Constraints**
- R8. Must not require full photo library permissions — continue using the system picker which uses limited access

## Success Criteria

- Users never see a blank screen after pressing capture, under any app lifecycle condition
- Photo capture flow works identically from any tab, with completion feedback appearing regardless of which tab the user is on
- Visual change to the tab bar is minimal — the capture button still appears in approximately the same location

## Scope Boundaries

- **Not in scope:** Adding camera, link, or share extension capture methods (future work)
- **Not in scope:** Custom photo grid or permission dialogs
- **Not in scope:** Cleanup of unreachable `src/app/add.tsx` modal route or unused `AddEventButton` component (dead code, separate task)
- **Not in scope:** Matching iOS Liquid Glass scroll-collapse behavior — impossible with a non-`NativeTabs.Trigger` button since `minimizeBehavior` is a UIKit-level prop that only applies to native tab items

## Key Decisions

- **Overlay button over custom tab bar:** Preserves native tab bar behaviors (blur effect, badges, scroll-collapse for real tabs, Liquid Glass styling) while eliminating the blank screen root cause
- **Stay on current tab after capture:** Natural now that capture is an overlay action, not a tab navigation. Existing global completion feedback already handles visibility on any tab
- **Accept minor visual shift:** Exact replication of `role="search"` top-right positioning is not achievable with an overlay; approximate proximity is acceptable

## Dependencies / Assumptions

- Assumes `useCaptureCompletionFeedback` at `src/app/_layout.tsx:332` continues to surface capture completion globally — verified during brainstorm
- Assumes the two dead-code paths (`src/app/add.tsx` modal, `src/components/AddEventButton.tsx`) remain unreachable and do not need coordinated removal in this work

## Outstanding Questions

### Deferred to Planning
- [Affects R3][Technical] Where exactly should the overlay button be positioned — via absolute positioning over the tab bar, a wrapper around `NativeTabs`, or a portal? This is a layout/rendering decision for planning.
- [Affects R3][Needs research] Does the overlay button need to hide or adjust when the native tab bar collapses on scroll, or is that out of scope given the collapse-matching boundary?

## Next Steps

→ `/ce:plan` for structured implementation planning
