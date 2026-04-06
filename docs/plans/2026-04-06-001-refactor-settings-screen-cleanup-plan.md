---
title: "refactor: Clean up Settings screen styling consistency"
type: refactor
status: completed
date: 2026-04-06
origin: docs/brainstorms/2026-04-06-settings-screen-cleanup-requirements.md
---

# Refactor: Clean up Settings screen styling consistency

## Overview

Standardize the settings screen (`apps/expo/src/app/settings/account.tsx`) so all sections use the `SettingsSection` component, color classes are unified to `neutral-*`, spacing is consistent, and spacer hacks are removed.

## Problem Frame

The settings screen has 6 content sections but only 2 use the `SettingsSection` component. The remaining 4 manually create headers with inconsistent spacing (`mt-8` vs `mt-12`), font sizes (`text-base` vs `text-lg`), and margins (`mb-2` vs `mb-3`). Color classes mix `gray-*` and `neutral-*`. A `<View className="h-4" />` spacer hack separates buttons in the Danger Zone. (See origin: `docs/brainstorms/2026-04-06-settings-screen-cleanup-requirements.md`)

## Requirements Trace

- R1. All section headers use the `SettingsSection` component
- R2. Unify color classes to `neutral-*` (replace all `gray-*`)
- R3. Standardize section spacing
- R4. Replace spacer hack with proper gap/margin
- R5. Keep `SettingsOption` component as-is (structure preserved, colors updated per R2)

## Scope Boundaries

- NOT adding notification toggle
- NOT extracting subscription logic into a separate component
- NOT restructuring the file or splitting into multiple files
- NOT changing the `gray-*` convention app-wide — only in `account.tsx`

## Context & Research

### Relevant Code and Patterns

- `SettingsSection` (lines 54-67): Uses `mt-8` top margin, `mb-3 text-lg font-semibold` for title
- `SettingsOption` (lines 70-89): Uses `border-gray-200`, `text-gray-500` — needs `neutral-*` replacement
- Existing `neutral-*` usage in same file: `border-neutral-300` (inputs), `text-neutral-500` (secondary text), `bg-neutral-50` (preview bg), `text-neutral-700` (emphasized text)
- Outer container (line 389): `flex-col gap-4 space-y-6` — redundant (both apply vertical spacing)

### Color Mapping

The `gray-*` scale is remapped to project design tokens in `tooling/tailwind/base.ts`. The rest of the file uses standard Tailwind `neutral-*`. To maintain visual consistency within the file, map:

| Current (`gray-*`) | Replacement (`neutral-*`) | Context |
|---|---|---|
| `border-gray-200` | `border-neutral-200` | Card/section borders |
| `border-gray-100` | `border-neutral-100` | Inner dividers |
| `text-gray-500` | `text-neutral-500` | Secondary/subtitle text |
| `text-gray-700` | `text-neutral-700` | Emphasized secondary text |
| `bg-gray-50` | `bg-neutral-50` | Light backgrounds |

### Section Inventory

| Section | Currently uses `SettingsSection` | Top margin | Title style |
|---|---|---|---|
| Account Information | No | none (parent gap) | `text-lg font-semibold` |
| Share Your Events | Yes | `mt-8` | standard |
| Preferences | No | `mt-8` (manual) | `text-lg font-semibold` (missing `mb-3`) |
| App Settings | Yes | `mt-8` | standard |
| Subscription | No | `mt-12` | `text-lg font-semibold` |
| Dev Testing | No | `mt-12` | `text-base font-semibold text-blue-600` |
| Danger Zone | No | `mt-12` | `text-base font-semibold text-red-500` |

## Key Technical Decisions

- **Add optional `titleClassName` prop to `SettingsSection`**: Danger Zone needs red title text, Dev Testing needs blue. Rather than keeping those sections as special cases, extend `SettingsSection` with an optional override prop. This is minimal and preserves R1.
- **Standardize on `mt-8` for all sections**: The `mt-12` on Subscription/Dev Testing/Danger Zone was ad-hoc, not intentional differentiation. `SettingsSection` already uses `mt-8` — keep it.
- **Remove `space-y-6` from outer container**: It conflicts with `gap-4`. Keep `gap-4` only, since `SettingsSection` already provides its own `mt-8`.
- **Replace spacer hack with `gap-4`**: Wrap the Danger Zone buttons in a `View` with `gap-4` instead of the `<View className="h-4" />` spacer.

## Implementation Units

- [ ] **Unit 1: Extend `SettingsSection` and update color classes**

  **Goal:** Add optional `titleClassName` prop to `SettingsSection`, replace all `gray-*` classes with `neutral-*` equivalents, and update `SettingsOption` colors.

  **Requirements:** R2, R5, partial R1

  **Dependencies:** None

  **Files:**
  - Modify: `apps/expo/src/app/settings/account.tsx`

  **Approach:**
  - Add `titleClassName?: string` prop to `SettingsSection`. When provided, append it to the default title classes. When not provided, behavior is unchanged.
  - Find-and-replace all 9 `gray-*` class occurrences with their `neutral-*` equivalents per the color mapping table above.

  **Patterns to follow:**
  - Existing `neutral-*` usage elsewhere in the file (e.g., `border-neutral-300` on line 428, `text-neutral-500` on line 419)

  **Test expectation:** none — pure styling refactor with no behavioral change

  **Verification:**
  - `SettingsSection` accepts optional `titleClassName`
  - Zero `gray-` occurrences remain in the file (grep confirms)

- [ ] **Unit 2: Wrap all sections in `SettingsSection` and standardize spacing**

  **Goal:** Migrate all 5 non-compliant sections to use `SettingsSection`, fix outer container spacing, and replace the spacer hack.

  **Requirements:** R1, R3, R4

  **Dependencies:** Unit 1 (needs `titleClassName` for Danger Zone and Dev Testing)

  **Files:**
  - Modify: `apps/expo/src/app/settings/account.tsx`

  **Approach:**
  - **Account Information** (line 413-415): Wrap in `<SettingsSection title="Account Information">`. Remove the manual `<View><Text>` header.
  - **Preferences** (line 551-552): Replace `<View className="mt-8"><Text className="text-lg font-semibold">` with `<SettingsSection title="Preferences">`.
  - **Subscription** (line 576-577): Replace `<View className="mt-12"><Text className="text-lg font-semibold">` with `<SettingsSection title="Subscription">`.
  - **Development Testing** (line 633-634): Replace manual View/Text with `<SettingsSection title="Development Testing" titleClassName="text-blue-600">`.
  - **Danger Zone** (line 652): Replace manual View/Text with `<SettingsSection title="Danger Zone" titleClassName="text-red-500">`.
  - **Outer container** (line 389): Change `flex-col gap-4 space-y-6` to just `flex-col` (sections manage their own spacing via `mt-8`).
  - **Spacer hack** (line 664): Replace `<View className="h-4" />` between buttons with a parent `<View className="gap-4">` wrapping both buttons.
  - Remove the standalone `<Text className="mt-2 text-xs text-neutral-500">` warning text's `mt-2` and let the gap handle it, or keep `mt-2` if it's within the same button group.

  **Patterns to follow:**
  - Existing `SettingsSection` usage for "Share Your Events" (line 468) and "App Settings" (line 568)

  **Test expectation:** none — pure styling/structural refactor with no behavioral change

  **Verification:**
  - All sections use `<SettingsSection>`
  - No manual section headers remain (no raw `<Text className="...text-lg font-semibold">` outside of `SettingsSection`)
  - No `<View className="h-4" />` spacer remains
  - No `space-y-6` class on outer container
  - Screen renders correctly with consistent spacing between all sections

## System-Wide Impact

- **Interaction graph:** No callbacks, mutations, or navigation changes. Pure styling.
- **Error propagation:** N/A
- **State lifecycle risks:** None
- **API surface parity:** N/A
- **Unchanged invariants:** All functionality (toggles, inputs, navigation, mutations) unchanged. Only className props change.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `gray-*` and `neutral-*` render differently due to Tailwind config remapping | Color mapping table verified against config. Visual difference is minor (both are gray tones) and achieves in-file consistency. |
| Removing `space-y-6` + `gap-4` from outer container changes spacing | `SettingsSection` already provides `mt-8`. Test visually after change. |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-06-settings-screen-cleanup-requirements.md](docs/brainstorms/2026-04-06-settings-screen-cleanup-requirements.md)
- Related issue: #965
- Tailwind config: `tooling/tailwind/base.ts` (gray color remapping)
