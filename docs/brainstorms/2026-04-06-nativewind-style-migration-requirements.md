---
date: 2026-04-06
topic: nativewind-style-migration
---

# Migrate Inline Styles to NativeWind

## Problem Frame

The Expo app's styling is in an inconsistent hybrid state. AGENTS.md declares NativeWind as the standard, but 55 of ~201 files use inline `style=` props, 41 files mix both approaches, and 6 files use `StyleSheet.create`. This inconsistency makes the codebase harder to maintain and onboard into.

## Requirements

**Migration**
- R1. Convert all static inline `style={{...}}` props to NativeWind `className` equivalents, using Tailwind arbitrary value syntax (e.g., `p-[18px]`) when no standard utility exists
- R2. Convert `StyleSheet.create` definitions to NativeWind `className`, splitting mixed files so static styles become className and only dynamic/calculated values remain as inline `style=`
- R3. Retain inline `style=` only for values that require JS evaluation at runtime: dynamic/calculated values (e.g., `width: size`, `bottom: offset + insets.bottom`), and platform-specific APIs not expressible as CSS (e.g., Liquid Glass tint effects)

**Quality**
- R4. No visual regressions — each migrated component must look and behave identically
- R5. Migrate files atomically (one file = one working state) so progress is incremental and reviewable

## Scope Boundaries

- Mobile app only (`apps/expo/src/`)
- No changes to the Tailwind config or NativeWind setup — use arbitrary value syntax (`mt-[18px]`) for non-standard values instead of adding config entries
- No new abstractions or utility wrappers — just direct style-to-className conversion
- StyleSheet.create patterns used for complex platform-specific effects (LiquidGlassHeader, GlassButton) may partially remain if they involve values NativeWind can't express

## Success Criteria

- Zero files using static inline styles that are expressible as Tailwind classes
- `StyleSheet.create` eliminated except where genuinely required for dynamic/platform styles
- `pnpm lint:fix && pnpm format:fix && pnpm check` passes
- App builds and runs without visual regressions

## Key Decisions

- **Full scope**: Migrating all 55 files, not just worst offenders
- **Keep necessary inline styles**: Only values requiring JS runtime evaluation stay as `style=`
- **Arbitrary value syntax is in-scope**: Use `className="p-[18px]"` for non-standard values rather than keeping them as inline styles or modifying Tailwind config

## Outstanding Questions

### Deferred to Planning
- [Affects R2] (Technical) For the 6 StyleSheet.create files, which specific styles are dynamic vs static and can be split?
- [Affects R4] (Technical) What's the best approach for verifying no visual regressions — manual review, screenshots, or snapshot tests?

## Next Steps

-> `/ce:plan` for structured implementation planning
