# Port prompt — OnboardingOrbit → Soonlist Turbo

Paste the section below into Claude Code running at `~/soonlist-turbo`.

---

## Prompt to paste

I have a self-contained React Native component I want to port into this repo. It's an ambient "soft tilted disc orbit" animation of 12 event-screenshot cards, designed to sit above an onboarding CTA. It was prototyped in `~/baby-soonlist-mobile` and is locked in — do not change the animation math, config values, or image ordering.

**Source (already prepared, do not modify):**
`~/baby-soonlist-mobile/port-to-turbo/OnboardingOrbit/`

Contents:

- `index.tsx` — the standalone component (one file, ~140 LOC)
- `images/01.jpg`–`12.jpg` — 12 pre-compressed screenshots (600px wide JPG, ~1.1MB total) in orbit order

**Destination in this repo:**
`apps/expo/src/components/OnboardingOrbit/`

This folder does not exist yet. Copy the entire source folder:

```bash
cp -R ~/baby-soonlist-mobile/port-to-turbo/OnboardingOrbit \
      apps/expo/src/components/OnboardingOrbit
```

After the copy, verify:

- `apps/expo/src/components/OnboardingOrbit/index.tsx` exists
- `apps/expo/src/components/OnboardingOrbit/images/` contains `01.jpg` through `12.jpg`

**Dependencies (already present in this repo — just sanity-check, do not install):**

- `react-native-reanimated`
- `expo-image`

**How to use it**

The component is a default export. It takes `width` and `height` props (both required) and fills the given box with the orbit. Typical usage in an onboarding screen:

```tsx
import { useWindowDimensions, View } from "react-native";

import OnboardingOrbit from "~/components/OnboardingOrbit";

export default function YourListScreen() {
  const { width: screenW } = useWindowDimensions();
  const stageW = screenW;
  const stageH = stageW * (4 / 3); // 3:4 portrait stage

  return (
    <View style={{ flex: 1 }}>
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <OnboardingOrbit width={stageW} height={stageH} />
      </View>
      {/* headline + CTA below */}
    </View>
  );
}
```

The component starts already spinning on mount (no entrance animation) and loops forever at 18s per revolution.

**After copying:**

1. Run `pnpm tsc -b apps/expo` (or the workspace equivalent) to confirm the component type-checks in this repo's tsconfig.
2. Do not integrate it into any onboarding screen yet — I'll tell you which screen to wire it into next.

---

## Reference — what's in the component

Locked config (do not change):

| Field                   | Value       | Meaning                                             |
| ----------------------- | ----------- | --------------------------------------------------- |
| `cardCount`             | 12          | always exactly 12 images                            |
| `tiltRatio`             | 0.32        | dramatic ellipse (`radiusY / radiusX`)              |
| `durationMs`            | 18000       | one full revolution                                 |
| `radiusRatio`           | 0.44        | `radiusX` as fraction of container width            |
| `cardWidthRatio`        | 0.16        | card width as fraction of container width           |
| `scaleMin` / `scaleMax` | 0.60 / 1.10 | back→front scale (depth sold by scale, not opacity) |
| `leanDeg`               | 5           | ±5° tangent lean per card as it orbits              |

Cards are fully opaque (`opacity: 1.0`) and depth is conveyed purely through scale + per-card ±5° tangent sway. The ordering in `images/01.jpg`–`12.jpg` is the Cast C3 shuffle from the baby-soonlist-mobile animation lab and must be preserved exactly.
