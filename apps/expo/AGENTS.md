# Expo App

React Native mobile app using Expo Router, NativeWind, and React Query.

## State Management

For Zustand patterns, see [.cursor/rules/zustand.mdc](../../.cursor/rules/zustand.mdc).

The store lives in `src/store.ts`.

## Animations

Use React Native Reanimated with shared values:

```typescript
const sv = useSharedValue(0);
sv.value = withTiming(100);
```

Use `Animated.View` and similar animated components.

## Styling

NativeWind (TailwindCSS for React Native).

## Navigation

Expo Router provides typed file-based navigation.

## Modals

Use Expo Router routes with `presentation: "formSheet"` (or `"modal"`) for
sheet-like UI — not React Native's `Modal` component. This keeps the native
header, swipe-to-dismiss, and deep-link behavior consistent with screens like
Event Details and Share Setup.

Place sheet routes under the `(modals)` route group
(`src/app/(modals)/…`). Register each screen directly on the root stack in
`src/app/_layout.tsx` and spread the shared defaults from
`src/utils/sheetOptions.ts`:

```tsx
import { defaultSheetOptions } from "~/utils/sheetOptions";

<Stack.Screen
  name="(modals)/subscribed-lists"
  options={{
    ...defaultSheetOptions,
    title: "Subscribed lists",
    sheetAllowedDetents: [0.6, 1.0],
  }}
/>;
```

The one exception is centered overlay dialogs (confirmation / input prompts
like `Dialog`, `UsernameEntryModal`, `CodeEntryModal`) — those stay as RN
`Modal` with `transparent` + `fade` because they're alerts, not screens.

## Development

- Each developer needs a personal ngrok edge (see root README.md)
- E2E tests use Maestro (`.maestro/` directory)
- Run tests: `pnpm test`

## Push Notifications

OneSignal handles push notifications.
