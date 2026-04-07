---
title: "refactor: migrate remaining static Expo inline styles to NativeWind"
type: refactor
status: active
date: 2026-04-06
origin: docs/brainstorms/2026-04-06-expo-nativewind-inline-style-migration-requirements.md
---

# refactor: migrate remaining static Expo inline styles to NativeWind

## Overview

Convert the remaining low-risk static inline styles and simple `StyleSheet` usage in the Expo app to NativeWind, while preserving current visuals and leaving runtime-driven styles imperative. The goal is to make the app's styling approach more consistent without turning the refactor into a redesign or abstraction exercise.

## Problem Frame

The Expo app is already built around NativeWind (`apps/expo/AGENTS.md`, `.cursor/rules/react.mdc`), but a smaller set of screens and shared components still mix `className` with inline `style` objects and `StyleSheet` blocks. This makes styling harder to scan and maintain, especially in files that already use NativeWind for most of their layout. The origin requirements define a whole-app sweep with strict parity and an explicit stop condition once the remaining styles are mostly runtime math or third-party constrained (see origin: `docs/brainstorms/2026-04-06-expo-nativewind-inline-style-migration-requirements.md`).

## Requirements Trace

- R1. Sweep the Expo app and convert clearly static inline styles to `className` where the change is low-risk and behavior-preserving.
- R2. In mixed cases, move static spacing, color, typography, border, radius, alignment, and layout values to `className`, leaving only runtime-dependent values in `style`.
- R3. Apply the same conversion rule to simple static `StyleSheet` usage on standard React Native primitives when it remains clear and safe.
- R4. Preserve current visual output and interaction behavior with no intentional polish or redesign.
- R5. Keep imperative styles for measured dimensions, font scaling, safe-area math, keyboard offsets, animated transforms or opacity, and conditional absolute positioning.
- R6. Leave third-party style props and style-adjacent props such as `contentContainerStyle`, `columnWrapperStyle`, and `placeholderTextColor` unchanged unless a partial extraction is obviously safe.
- R7. Each touched file must materially reduce inline-style surface area; skip files that are mostly dynamic by the time they are reached.
- R8. Prefer direct refactors over helpers or wrappers created only to eliminate the last few inline styles.
- R9. Prioritize the biggest hotspots and shared components first, then continue into lower-risk screens until the remaining styles are mostly justified.

## Scope Boundaries

- Not redesigning or visually polishing screens
- Not forcing near-zero inline styles through wrapper components or helper abstractions
- Not rewriting animation logic, measured layout logic, safe-area handling, or keyboard behavior to fit NativeWind
- Not converting non-`style` props just for consistency when they are not a clear NativeWind fit
- Not changing copy, navigation, state, or product behavior except for minimal structure needed to attach a `className`

## Context & Research

### Relevant Code and Patterns

- `apps/expo/AGENTS.md` and `.cursor/rules/react.mdc` establish NativeWind as the mobile styling standard.
- `apps/expo/src/components/Button.tsx` shows the preferred pattern: static layout, spacing, and variant styling live in `className`, with no extra wrapper abstractions.
- `apps/expo/src/components/EventPreview.tsx` and `apps/expo/src/components/PhotoGrid.tsx` already mix `className` with targeted `style` usage, which makes them good reference points for splitting static vs dynamic styles.
- `apps/expo/src/components/Dialog.tsx`, `apps/expo/src/components/GlassButton.tsx`, `apps/expo/src/components/LiquidGlassHeader.tsx`, `apps/expo/src/components/auth/ResetAuthButton.tsx`, and `apps/expo/src/components/OfflineIndicator.tsx` are self-contained shared components with static `StyleSheet` usage and low behavior risk.
- The remaining largest hotspots from a repo scan are `apps/expo/src/components/UserEventsList.tsx`, `apps/expo/src/app/(tabs)/following/index.tsx`, `apps/expo/src/components/GlassButton.tsx`, `apps/expo/src/components/Dialog.tsx`, and `apps/expo/src/app/event/[id]/index.tsx`.
- Dynamic cases already visible in the repo include `keyboardStyle` in `apps/expo/src/app/add.tsx` and `apps/expo/src/app/new.tsx`, safe-area padding in `apps/expo/src/components/NotificationBanner.tsx` and `apps/expo/src/components/FollowedListsModal.tsx`, animated opacity/position in `apps/expo/src/components/OfflineIndicator.tsx`, and font-scale-driven card sizing in `apps/expo/src/components/UserEventsList.tsx`.

### Institutional Learnings

- No `docs/solutions/` directory or stored project learnings were present during planning, so this plan relies on current repo patterns.

### External References

- None. The codebase already has strong local NativeWind patterns, and this refactor does not touch unstable external APIs or contracts.

## Key Technical Decisions

- **Use a conversion matrix instead of a blanket ban on `style`:** The implementation should decide per style category whether it belongs in `className`, a residual `style` object, or an unchanged third-party prop.
- **Start with shared component wins, then mixed screen files, then dynamic hotspots:** This gets the cleanest reductions first and avoids spending most of the refactor budget on the hardest files.
- **Keep `StyleSheet.absoluteFill` / `StyleSheet.absoluteFillObject` only when it remains the clearest safe expression for nonstandard components or overlay layers:** For ordinary `View` layers, prefer `className="absolute inset-0"`; for cases like `BlurView`, keep the imperative form if className support is uncertain.
- **Do not introduce helper abstractions just to encode a handful of Tailwind classes:** The repo already supports arbitrary values and utility composition through `className`; added helpers would increase carrying cost for little benefit.
- **Treat the migration as complete when the remaining inline styles are mostly dynamic, animated, safe-area-driven, or attached to third-party props:** Completion is defined by justified residual styles, not by raw zero counts.

## Open Questions

### Resolved During Planning

- **Should the whole-app sweep include files that are almost entirely dynamic by the time they are reached?** No. Stop touching a file once it no longer offers a material static-style reduction.
- **Should style-adjacent props such as `placeholderTextColor` and `contentContainerStyle` be normalized during this refactor?** No. They stay as-is unless a narrow partial extraction is obviously safe.
- **Should the migration introduce shared wrappers or helpers to eliminate the last few inline styles?** No. Direct local refactors are the preferred approach.

### Deferred to Implementation

- Exact file cutoff after the first two passes. The implementer should stop when remaining candidates are mostly dynamic or third-party constrained.
- Whether a small number of overlay-related `StyleSheet` helpers remain clearer than `className`, especially around `BlurView`, `Animated.View`, and `absoluteFill` usage.
- Exact arbitrary-value utilities needed for parity when converting static colors, radii, or shadows in mixed files. If parity would become uncertain, keep those values in `style`.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

| Style category | Typical examples | Plan of record |
|---|---|---|
| Static layout and spacing | `flex: 1`, padding, margin, row/column alignment, width/height constants | Move to `className` |
| Static visual tokens | background colors, text colors, borders, radii, font size/weight, simple opacity | Move to `className` when parity is straightforward |
| Mixed static + runtime styles | static border/background plus `width: imageSize`, `paddingTop: insets.top + 4`, `fontSize: 20 * fontScale` | Split: static pieces to `className`, runtime pieces stay in `style` |
| Animated or computed styles | `transform`, animated opacity, calculated position, conditional absolute offsets | Keep in `style` |
| Third-party style props | `contentContainerStyle`, `columnWrapperStyle`, `placeholderTextColor`, `Platform.select(...)` | Keep unchanged unless a narrow, safe extraction is obvious |
| Static `StyleSheet` on primitives | simple dialog/button/container styles on `View`, `Text`, `Pressable` | Inline into `className` and remove `StyleSheet` |
| Overlay fill helpers | `StyleSheet.absoluteFillObject`, `StyleSheet.absoluteFill` | Prefer `absolute inset-0` on standard primitives; retain imperative fill helpers where safer or clearer |

## Implementation Units

- [ ] **Unit 1: Convert static shared-component `StyleSheet` usage to NativeWind**

**Goal:** Remove the clearest remaining `StyleSheet`-based static styling from small shared components and establish the conversion pattern for the rest of the refactor.

**Requirements:** R1, R2, R3, R4, R7, R8

**Dependencies:** None

**Files:**
- Modify: `apps/expo/src/components/Dialog.tsx`
- Modify: `apps/expo/src/components/GlassButton.tsx`
- Modify: `apps/expo/src/components/LiquidGlassHeader.tsx`
- Modify: `apps/expo/src/components/OfflineIndicator.tsx`
- Modify: `apps/expo/src/components/auth/ResetAuthButton.tsx`
- Test: none -- styling-only refactor with no automated behavior change coverage expected

**Approach:**
- Replace static container, text, and button styles with `className` on standard React Native primitives.
- Keep residual `style` only for runtime-driven props such as `size`, `tintColor`, `tintOpacity`, animated opacity, and safe-area offsets.
- Remove `StyleSheet` blocks entirely where the file becomes simpler without them.
- For overlay fill layers, prefer `absolute inset-0` on ordinary `View` layers, but keep `StyleSheet.absoluteFill`/`absoluteFillObject` if that remains the safest expression for `BlurView` or similar nonstandard components.

**Patterns to follow:**
- `apps/expo/src/components/Button.tsx`
- `apps/expo/src/components/NotificationBanner.tsx`

**Test scenarios:**
- Test expectation: none -- these components are visual refactors only. Verification should rely on static review plus targeted UI spot checks.

**Verification:**
- Targeted components no longer rely on static `StyleSheet` blocks except for narrowly justified fill helpers.
- Dialog layout, offline indicator placement, reset-auth button copy layout, and liquid glass visuals remain unchanged.

- [ ] **Unit 2: Sweep low-risk screens and shared surfaces that mostly need static extraction**

**Goal:** Reduce inline-style usage in screens and components where most remaining styles are static spacing, alignment, image fill, or fixed dimensions.

**Requirements:** R1, R2, R4, R7, R8, R9

**Dependencies:** Unit 1 patterns established

**Files:**
- Modify: `apps/expo/src/app/(tabs)/feed/index.tsx`
- Modify: `apps/expo/src/app/(tabs)/following/index.tsx`
- Modify: `apps/expo/src/app/(onboarding)/onboarding/00-welcome.tsx`
- Modify: `apps/expo/src/app/(onboarding)/onboarding/01-try-it.tsx`
- Modify: `apps/expo/src/app/(onboarding)/onboarding/03-notifications.tsx`
- Modify: `apps/expo/src/components/FollowedListsModal.tsx`
- Modify: `apps/expo/src/components/NotificationBanner.tsx`
- Modify: `apps/expo/src/components/SaveShareButton.tsx`
- Test: none -- styling-only refactor with manual visual verification

**Approach:**
- Convert static header spacing, flex layout, button chrome, image fill, and rounded container styles to `className`.
- In mixed cases, keep only residual values such as safe-area top/bottom padding, exact shadow objects, and animation transforms in `style`.
- Avoid broad token cleanup while touching these files; if a class can preserve the current value, use it, otherwise keep the current imperative value.
- Use the feed/following header sections as a model for extracting static text spacing while retaining any platform or picker-related constraints.

**Patterns to follow:**
- `apps/expo/src/app/event/[id]/edit.tsx`
- `apps/expo/src/components/EventPreview.tsx`

**Test scenarios:**
- Test expectation: none -- styling-only refactor with no expected logic changes.

**Verification:**
- Feed and following headers, empty states, and segmented controls render the same as before.
- Onboarding screens preserve safe-area spacing, image sizing, and button placement.
- Notification and followed-lists surfaces retain their current insets and visual hierarchy.

- [ ] **Unit 3: Convert mixed media/input components while preserving third-party and platform-specific styles**

**Goal:** Reduce static inline style usage in media and form-related components without disturbing image sizing, platform-specific input behavior, or list props that still require objects.

**Requirements:** R1, R2, R4, R5, R6, R7, R9

**Dependencies:** Units 1-2

**Files:**
- Modify: `apps/expo/src/components/PhotoGrid.tsx`
- Modify: `apps/expo/src/components/EventPreview.tsx`
- Modify: `apps/expo/src/components/CodeEntryModal.tsx`
- Modify: `apps/expo/src/components/date-picker/DatePickerField.tsx`
- Modify: `apps/expo/src/components/date-picker/TimePickerField.tsx`
- Modify: `apps/expo/src/components/PlatformSelectNative.tsx`
- Modify: `apps/expo/src/components/TimezoneSelectNative.tsx`
- Modify: `apps/expo/src/app/event/[id]/edit.tsx`
- Test: none -- styling-only refactor with manual spot checks

**Approach:**
- Move static paddings, borders, radii, row/column alignment, and fixed-size wrappers to `className`.
- Keep `contentContainerStyle`, `columnWrapperStyle`, `placeholderTextColor`, modal/picker styles, and `Platform.select(...)` values in imperative form unless a safe partial extraction is obvious.
- Leave runtime image sizing (`imageSize`, `width: "100%"`, dynamic list gaps, and similar values) in `style` when converting them would either change semantics or require extra wrappers.
- Preserve text-input behavior on Android and existing expo-image behavior even if that means leaving a few single-purpose style props in place.

**Patterns to follow:**
- `apps/expo/src/components/PhotoGrid.tsx`
- `apps/expo/src/components/EventPreview.tsx`

**Test scenarios:**
- Test expectation: none -- no logic or state flow changes are planned.

**Verification:**
- Photo grid selection, plus-tile behavior, and image rendering behave exactly as before.
- Event preview modes (image, link, describe, empty) keep their current layout and input behavior.
- Date/time pickers and native selects preserve existing modal presentation and text alignment behavior.

- [ ] **Unit 4: Perform a guarded pass on high-dynamic hotspots and stop when residual styles are justified**

**Goal:** Reduce static inline-style usage in the largest remaining hotspot files without fighting dynamic sizing, font scaling, scene shadows, or safe-area math.

**Requirements:** R1, R2, R4, R5, R7, R8, R9

**Dependencies:** Units 1-3

**Files:**
- Modify: `apps/expo/src/components/UserEventsList.tsx`
- Modify: `apps/expo/src/app/[username]/index.tsx`
- Modify: `apps/expo/src/app/event/[id]/index.tsx`
- Modify: `apps/expo/src/components/AddEventButton.tsx`
- Modify: `apps/expo/src/components/EventMenu.tsx`
- Modify: `apps/expo/src/components/EventStats.tsx`
- Modify: `apps/expo/src/components/SocialProofTestimonials.tsx`
- Test: none -- styling-only refactor with targeted visual regression checks

**Approach:**
- Extract only clearly static parts of mixed objects, such as border/background/padding/radius/text styling, and leave dynamic sizing, font-scale calculations, computed card paddings, image widths, scene shadows, and insets in `style`.
- Use the existing hotspot scan as a guide, but stop touching a file once the remaining inline styles are predominantly runtime-derived.
- Do not normalize colors, rename local variables, or restructure rendering trees solely to remove a handful of residual `style` props.
- Treat any shadow object that lacks a clean NativeWind equivalent as justified imperative styling to preserve parity.

**Patterns to follow:**
- `apps/expo/src/components/UserEventsList.tsx`
- `apps/expo/src/app/[username]/index.tsx`

**Test scenarios:**
- Test expectation: none -- the plan intentionally avoids behavior changes and relies on visual confirmation.

**Verification:**
- User event cards, username profile surfaces, event detail layouts, and floating add-event controls look and behave the same as before.
- Residual inline styles in these files are mostly dynamic, animated, or third-party constrained rather than static layout clutter.

- [ ] **Unit 5: Run a repo-wide audit and finalize the stop boundary**

**Goal:** Confirm the migration achieved a meaningful reduction in static inline styling across the Expo app and document the justified residual cases.

**Requirements:** R1, R4, R6, R7, R9

**Dependencies:** Units 1-4

**Files:**
- Modify: `apps/expo/src/**` (only remaining low-risk files that still contain clear static inline styles)
- Test: none -- audit and cleanup pass

**Approach:**
- Re-scan the Expo app for inline `style` usage, `StyleSheet.create`, and style-adjacent props to compare the post-refactor hotspots against the pre-refactor baseline.
- Make a final pass only on files that still contain obvious static values and can be improved without violating the dynamic-style guardrails.
- Leave a file untouched if the remaining usages are primarily safe-area offsets, animation values, computed dimensions, font scaling, or third-party style props.
- Use this pass to remove stale `StyleSheet` imports and other cleanup directly tied to the migration, but not to broaden scope.

**Patterns to follow:**
- The conversion matrix in this plan
- The completed files from Units 1-4

**Test scenarios:**
- Test expectation: none -- audit-only pass.

**Verification:**
- The largest remaining Expo styling hotspots are materially reduced from the initial scan.
- Remaining inline styles are predominantly justified residual cases rather than missed static opportunities.
- No touched file introduces visual regressions relative to the pre-migration UI.

## System-Wide Impact

- **Developer ergonomics:** More Expo components will follow the repo's existing NativeWind-first styling convention, making screens easier to scan and update.
- **Refactor risk profile:** This work touches many files but intentionally avoids behavioral logic, state, routing, and data flow changes. The main risk is visual drift from over-converting dynamic styles.
- **Residual imperative styling:** The app will still retain some inline styles after this work, but those should mostly correspond to computed layout, animation state, shadows without good utility parity, and third-party APIs that expect object values.

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| The migration expands into an endless hunt for zero inline styles | Use Unit 5 as the explicit stop boundary and stop once residual styles are mostly justified |
| NativeWind utilities do not preserve exact parity for certain shadows, fills, or arbitrary values | Keep those cases in `style` rather than forcing a class conversion |
| Converting mixed files creates noisy churn with little payoff | Prioritize files with meaningful static-style wins and skip files that are mostly dynamic by the time they are reached |
| Overlay and safe-area refactors accidentally change layout behavior | Preserve computed offsets in `style` and use targeted simulator spot checks on affected screens |

## Sources & References

- Origin requirements: `docs/brainstorms/2026-04-06-expo-nativewind-inline-style-migration-requirements.md`
- Styling guidance: `apps/expo/AGENTS.md`
- React guidance: `.cursor/rules/react.mdc`
- Representative patterns: `apps/expo/src/components/Button.tsx`, `apps/expo/src/components/EventPreview.tsx`, `apps/expo/src/components/PhotoGrid.tsx`
