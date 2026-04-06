---
date: 2026-04-06
topic: settings-screen-cleanup
---

# Settings Screen Cleanup

## Problem Frame
The settings screen (`apps/expo/src/app/settings/account.tsx`) has inconsistent styling — some sections use the `SettingsSection` component while others use raw `<View>`, color classes mix `neutral-*` and `gray-*`, and spacing varies between `mt-8` and `mt-12`. This makes the screen feel unpolished and harder to maintain.

## Requirements

- R1. All section headers must use the existing `SettingsSection` component (Preferences, Subscription, Development Testing, Danger Zone currently don't)
- R2. Unify all color utility classes to `neutral-*` — replace all `gray-*` usages
- R3. Standardize section spacing to a consistent value (currently mixed `mt-8`/`mt-12`)
- R4. Replace the `<View className="h-4" />` spacer hack in Danger Zone with proper gap/margin utilities
- R5. Keep the existing `SettingsOption` component — it's only used once but is a clean pattern for future settings items

## Scope Boundaries
- NOT adding notification toggle (separate work)
- NOT extracting subscription logic into a separate component
- NOT restructuring the file or breaking it into multiple files

## Success Criteria
- All settings sections use `SettingsSection` consistently
- No `gray-*` classes remain in the file
- Spacing between sections is uniform
- No spacer-hack Views

## Next Steps
→ `/ce:plan` for structured implementation planning
