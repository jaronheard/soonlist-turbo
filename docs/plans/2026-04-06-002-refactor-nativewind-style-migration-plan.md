---
title: "refactor: Migrate inline styles to NativeWind across Expo app"
type: refactor
status: active
date: 2026-04-06
origin: docs/brainstorms/2026-04-06-nativewind-style-migration-requirements.md
---

# refactor: Migrate inline styles to NativeWind across Expo app

## Overview

Convert all static inline `style=` props and `StyleSheet.create` definitions to NativeWind `className` across ~55 files in the Expo app. Retain inline `style=` only for values requiring JS runtime evaluation (dynamic calculations, animated values, platform-specific APIs). This enforces the NativeWind standard declared in AGENTS.md.

## Problem Frame

The Expo app's styling is inconsistent: 55 files use inline `style=`, 41 mix both approaches, and 6 use `StyleSheet.create`, despite NativeWind being the declared standard. (see origin: docs/brainstorms/2026-04-06-nativewind-style-migration-requirements.md)

## Requirements Trace

- R1. Convert all static inline `style={{...}}` to `className`, using arbitrary value syntax (`p-[18px]`) when no standard utility exists
- R2. Convert `StyleSheet.create` definitions to `className`, splitting so only dynamic values remain as `style=`
- R3. Retain inline `style=` only for runtime-dynamic values and platform-specific APIs
- R4. No visual regressions
- R5. Migrate files atomically

## Scope Boundaries

- Mobile app only (`apps/expo/src/`)
- No Tailwind config or NativeWind setup changes
- No new abstractions — direct style-to-className conversion
- Use arbitrary value syntax for non-standard values
- Prefer `neutral-*` over `gray-*` when migrating color values
- Replace `<View className="h-N" />` spacer hacks with `gap-*` on parents where natural

## Context & Research

### Relevant Code and Patterns

- **Best pattern file**: `apps/expo/src/components/Button.tsx` — uses `cva()` variants, `cn()` merging, zero inline styles
- **Clean conditional pattern**: `apps/expo/src/components/QuestionOption.tsx` — `cn()` with state-driven classes
- **Simple layout pattern**: `apps/expo/src/components/QuestionContainer.tsx` — pure `className` usage
- **cn() utility**: `apps/expo/src/utils/cn.ts` — `twMerge(clsx(...inputs))`
- **Design tokens**: `interactive-1/2/3`, `accent-*`, `neutral-*`, `success`, full shadcn palette in `tooling/tailwind/base.ts`
- **Animated pattern**: `apps/expo/src/components/ProgressBar.tsx` — `className` for static, `style={animatedStyle}` for Reanimated values

### Institutional Learnings

- `gray-*` is remapped to neutral tokens in config; prefer `neutral-*` for consistency
- Avoid combining `gap-*` with `space-y-*` on the same element
- Replace spacer `<View className="h-N" />` with `gap-*` on parent containers

## Key Technical Decisions

- **Batch by feature area**: Group files by directory/feature for parallel subagent execution on non-overlapping files
- **No tests needed**: Pure styling refactor with no behavioral change; verification is `pnpm check` + manual visual review
- **Use cn() for conditionals**: When migrating conditional inline styles, use `cn()` from `~/utils/cn`
- **Arbitrary values over config changes**: `mt-[18px]` not a new Tailwind config entry
- **Visual verification**: Manual review after each batch + `pnpm check` for type safety

## Open Questions

### Resolved During Planning

- **How to verify no visual regressions?** Manual review per batch + `pnpm check` for type errors. No snapshot tests — the cost/benefit doesn't justify it for a mechanical migration.
- **StyleSheet.create splitting strategy?** Read each file, identify which properties are static (convertible) vs dynamic (must remain). Static properties become className, dynamic stay as style=.

### Deferred to Implementation

- Exact className equivalents for unusual inline style values will be determined file-by-file during conversion
- Some StyleSheet.create files (especially LiquidGlassHeader, GlassButton) may have more dynamic styles than expected — the implementer should judge per-property

## Implementation Units

- [ ] **Unit 1: StyleSheet.create files (6 files)**

  **Goal:** Convert or split all `StyleSheet.create` definitions. Remove StyleSheet imports where fully converted.

  **Requirements:** R2, R3

  **Dependencies:** None

  **Files:**
  - Modify: `apps/expo/src/app/_layout.tsx`
  - Modify: `apps/expo/src/components/Dialog.tsx`
  - Modify: `apps/expo/src/components/OfflineIndicator.tsx`
  - Modify: `apps/expo/src/components/auth/ResetAuthButton.tsx`
  - Modify: `apps/expo/src/components/GlassButton.tsx`
  - Modify: `apps/expo/src/components/LiquidGlassHeader.tsx`

  **Approach:**
  - Read each file and classify every StyleSheet property as static or dynamic
  - Convert static properties to className
  - Keep dynamic properties (calculated sizes, platform APIs like Liquid Glass tint) as inline style=
  - Remove StyleSheet.create and StyleSheet import when fully converted
  - GlassButton and LiquidGlassHeader will likely retain partial inline styles for platform-specific effects

  **Patterns to follow:**
  - `apps/expo/src/components/Button.tsx` for variant-driven components
  - `apps/expo/src/components/ProgressBar.tsx` for animated/dynamic style hybrid

  **Test expectation:** none — pure styling refactor with no behavioral change

  **Verification:**
  - `pnpm check` passes with no type errors
  - StyleSheet.create removed from files where all styles were static
  - Remaining inline styles are only for runtime-dynamic values

- [ ] **Unit 2: Inline-style-only files (12 files)**

  **Goal:** Fully convert files that use inline `style=` but no `className` to NativeWind-only.

  **Requirements:** R1, R3

  **Dependencies:** None

  **Files:**
  - Modify: `apps/expo/src/app/(onboarding)/_layout.tsx`
  - Modify: `apps/expo/src/app/(tabs)/feed/_layout.tsx`
  - Modify: `apps/expo/src/app/(tabs)/following/_layout.tsx`
  - Modify: `apps/expo/src/app/redirect.tsx`
  - Modify: `apps/expo/src/components/AppleSignInButton.tsx`
  - Modify: `apps/expo/src/components/CaptureOverlayButton.tsx`
  - Modify: `apps/expo/src/components/EmailSignInButton.tsx`
  - Modify: `apps/expo/src/components/EventMenu.tsx`
  - Modify: `apps/expo/src/components/GoogleSignInButton.tsx`
  - Modify: `apps/expo/src/components/HeaderLogo.tsx`
  - Modify: `apps/expo/src/components/SoonlistAppIcon.tsx`
  - Modify: `apps/expo/src/components/ui/CircularSpinner.tsx`

  **Approach:**
  - Convert all static `style={{...}}` to `className`
  - Use arbitrary value syntax for non-standard values
  - Use `cn()` for conditional styling
  - Retain only runtime-dynamic values as `style=`

  **Patterns to follow:**
  - `apps/expo/src/components/QuestionContainer.tsx` for simple layout components
  - `apps/expo/src/components/QuestionOption.tsx` for conditional className

  **Test expectation:** none — pure styling refactor

  **Verification:**
  - Zero static inline styles remaining in these files
  - `pnpm check` passes

- [ ] **Unit 3: Onboarding & auth screens (8 files)**

  **Goal:** Migrate mixed inline styles in onboarding flow and auth components.

  **Requirements:** R1, R3

  **Dependencies:** None

  **Files:**
  - Modify: `apps/expo/src/app/(onboarding)/onboarding/00-welcome.tsx`
  - Modify: `apps/expo/src/app/(onboarding)/onboarding/01-try-it.tsx`
  - Modify: `apps/expo/src/app/(onboarding)/onboarding/02-your-list.tsx`
  - Modify: `apps/expo/src/app/(onboarding)/onboarding/03-notifications.tsx`
  - Modify: `apps/expo/src/app/(onboarding)/onboarding/05-sign-in.tsx`
  - Modify: `apps/expo/src/components/CodeEntryModal.tsx`
  - Modify: `apps/expo/src/components/SignInWithOAuth.tsx`
  - Modify: `apps/expo/src/components/SocialProofTestimonials.tsx`

  **Approach:**
  - Convert static inline styles to className
  - Use cn() for conditional class merging
  - These files likely have dynamic padding/margin for safe areas — keep those as style=

  **Patterns to follow:**
  - `apps/expo/src/components/QuestionOption.tsx`

  **Test expectation:** none — pure styling refactor

  **Verification:**
  - Zero convertible static inline styles remaining
  - `pnpm check` passes

- [ ] **Unit 4: Main app screens (9 files)**

  **Goal:** Migrate mixed inline styles in tab screens, event screens, and profile screens.

  **Requirements:** R1, R3

  **Dependencies:** None

  **Files:**
  - Modify: `apps/expo/src/app/(tabs)/feed/index.tsx`
  - Modify: `apps/expo/src/app/(tabs)/following/index.tsx`
  - Modify: `apps/expo/src/app/[username]/index.tsx`
  - Modify: `apps/expo/src/app/add.tsx`
  - Modify: `apps/expo/src/app/event/[id]/edit.tsx`
  - Modify: `apps/expo/src/app/event/[id]/index.tsx`
  - Modify: `apps/expo/src/app/event/[id]/qr.tsx`
  - Modify: `apps/expo/src/app/new.tsx`
  - Modify: `apps/expo/src/app/settings/account.tsx`

  **Approach:**
  - Convert static inline styles to className
  - Screen files may have more dynamic layout styles (safe area insets, scroll offsets) — keep those
  - Use arbitrary value syntax for non-standard spacing/sizing

  **Patterns to follow:**
  - `apps/expo/src/components/QuestionContainer.tsx` for layout patterns

  **Test expectation:** none — pure styling refactor

  **Verification:**
  - Zero convertible static inline styles remaining
  - `pnpm check` passes

- [ ] **Unit 5: Remaining components — banners, modals, and UI (18 files)**

  **Goal:** Migrate mixed inline styles in all remaining component files.

  **Requirements:** R1, R3

  **Dependencies:** None

  **Files:**
  - Modify: `apps/expo/src/components/AddEventButton.tsx`
  - Modify: `apps/expo/src/components/date-picker/DatePickerField.tsx`
  - Modify: `apps/expo/src/components/date-picker/TimePickerField.tsx`
  - Modify: `apps/expo/src/components/DiscoverShareBanner.tsx`
  - Modify: `apps/expo/src/components/EventListItemSkeleton.tsx`
  - Modify: `apps/expo/src/components/EventPreview.tsx`
  - Modify: `apps/expo/src/components/EventStats.tsx`
  - Modify: `apps/expo/src/components/FollowContextBanner.tsx`
  - Modify: `apps/expo/src/components/FollowedListsModal.tsx`
  - Modify: `apps/expo/src/components/FollowingFeedbackBanner.tsx`
  - Modify: `apps/expo/src/components/NotificationBanner.tsx`
  - Modify: `apps/expo/src/components/PhotoGrid.tsx`
  - Modify: `apps/expo/src/components/ProfileMenu.tsx`
  - Modify: `apps/expo/src/components/ProgressBar.tsx`
  - Modify: `apps/expo/src/components/SaveButton.tsx`
  - Modify: `apps/expo/src/components/SaveShareButton.tsx`
  - Modify: `apps/expo/src/components/UserEventsList.tsx`
  - Modify: `apps/expo/src/components/ui/WorkflowStatus.tsx`

  **Approach:**
  - Convert static inline styles to className
  - ProgressBar.tsx has Reanimated animated styles — keep those as style=
  - UserEventsList.tsx uses useWindowDimensions — many styles may be dynamic and should stay
  - Use cn() for conditional class merging where needed

  **Patterns to follow:**
  - `apps/expo/src/components/Button.tsx` for variant-driven components
  - `apps/expo/src/components/ProgressBar.tsx` for animated style hybrid

  **Test expectation:** none — pure styling refactor

  **Verification:**
  - Zero convertible static inline styles remaining
  - `pnpm check` passes

- [ ] **Unit 6: Final validation**

  **Goal:** Run full quality checks and verify migration completeness.

  **Requirements:** R4, R5

  **Dependencies:** Units 1-5

  **Files:**
  - All files modified in Units 1-5

  **Approach:**
  - Run `pnpm lint:fix && pnpm format:fix && pnpm check`
  - Grep for remaining `style={{` across `apps/expo/src/` and verify each is a legitimate dynamic style
  - Verify no `StyleSheet.create` remains except in files with genuinely dynamic/platform styles

  **Test expectation:** none — validation pass

  **Verification:**
  - `pnpm lint:fix && pnpm format:fix && pnpm check` passes clean
  - Grep audit shows only legitimate inline styles remain
  - All success criteria from requirements doc are met

## System-Wide Impact

- **Interaction graph:** No callbacks, middleware, or observers affected — pure styling change
- **Error propagation:** N/A
- **State lifecycle risks:** None — no state changes
- **API surface parity:** N/A
- **Integration coverage:** N/A — no behavioral changes to test
- **Unchanged invariants:** All component behavior, props, and event handling remain identical. Only the styling mechanism changes.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| NativeWind className doesn't perfectly match inline style (subtle layout differences) | Use arbitrary value syntax for exact values; manual visual review per batch |
| Some inline styles may appear static but are actually used in style arrays with dynamic overrides | Read full component context before converting; keep style= when part of a dynamic array |
| Shadow properties may not translate cleanly to NativeWind | Keep shadow styles as inline when NativeWind equivalents don't match iOS rendering |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-06-nativewind-style-migration-requirements.md](docs/brainstorms/2026-04-06-nativewind-style-migration-requirements.md)
- Pattern file: `apps/expo/src/components/Button.tsx`
- Pattern file: `apps/expo/src/components/QuestionOption.tsx`
- cn() utility: `apps/expo/src/utils/cn.ts`
- Design tokens: `tooling/tailwind/base.ts`
- NativeWind config: `apps/expo/tailwind.config.ts`
