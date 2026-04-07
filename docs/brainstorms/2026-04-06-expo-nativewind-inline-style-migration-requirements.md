---
date: 2026-04-06
topic: expo-nativewind-inline-style-migration
---

# Expo NativeWind Inline Style Migration

## Problem Frame
The Expo app already uses NativeWind heavily, but a smaller set of screens and shared components still mix `className` with inline `style` objects and a few `StyleSheet` blocks. That makes styling patterns less consistent, makes component markup harder to scan, and leaves the app split between two styling approaches even when the remaining styles are static.

## Requirements

**Migration Scope**
- R1. Sweep the Expo app and convert clearly static inline styles to NativeWind `className` utilities wherever the change is low-risk and behavior-preserving.
- R2. In mixed cases, extract static spacing, color, typography, border, radius, alignment, and layout values into `className`, while keeping only the runtime-dependent values in `style`.
- R3. Apply the same conversion rule to `StyleSheet` entries that only represent static styles on standard React Native views, text, and pressables, but do not force conversion when the existing style object is the clearer or safer expression.

**Behavior Preservation**
- R4. Preserve current visual output and interaction behavior. This migration must not introduce intentional design polish, layout changes, or token cleanups.
- R5. Keep imperative styles for measured dimensions, font scaling, safe-area offsets, keyboard offsets, animated transforms or opacity, conditional absolute positioning, and other values derived at runtime unless the static portion can be separated safely.
- R6. Leave third-party props and style-adjacent component APIs that require object values or dedicated props, such as `contentContainerStyle`, `columnWrapperStyle`, `placeholderTextColor`, and similar APIs, unchanged unless there is an obviously safe partial extraction that does not change behavior.

**Execution Guardrails**
- R7. Each touched file must end with materially less inline-style surface area than it started with. Do not churn files where almost all remaining styles are runtime-driven.
- R8. Prefer direct local refactors over new helpers, wrappers, or abstractions created only to eliminate the last few inline styles.
- R9. Prioritize the largest remaining hotspots and shared components first, then continue through lower-risk one-off screens until the remaining inline styles are mostly dynamic or third-party constrained.

## Success Criteria
- The Expo app has substantially fewer inline `style` usages and static `StyleSheet` definitions than before.
- Touched files use NativeWind for static styling wherever conversion is straightforward and low risk.
- Remaining inline styles are mostly limited to runtime-calculated values, animation state, safe-area math, or third-party style props.
- The migration does not intentionally change screen appearance or interaction behavior.

## Scope Boundaries
- NOT redesigning screens or polishing visual consistency
- NOT forcing near-zero inline styles at the cost of new abstraction layers
- NOT rewriting animation logic, measured layout logic, or safe-area handling just to fit NativeWind
- NOT converting non-`style` visual props just for the sake of consistency when they are not a clear NativeWind fit
- NOT changing copy, component structure, or product behavior except where a minimal structural wrapper is required for a safe style extraction

## Key Decisions
- Whole-app sweep, not a pilot: the migration should continue repo-wide until the remaining inline styles are mostly the cases that should stay imperative.
- Aggressive static extraction, conservative dynamic retention: static parts move to `className`, runtime math stays in `style`.
- Strict parity over cleanup: visual consistency issues that are unrelated to the migration are out of scope for this pass.

## Dependencies / Assumptions
- The Expo app's current NativeWind setup is already working and can express most static styles now represented inline.
- Some files will legitimately retain inline styles because React Native animation APIs, safe-area calculations, image sizing, and third-party list props still require object styles.

## Next Steps
-> `/ce:plan` for structured implementation planning
