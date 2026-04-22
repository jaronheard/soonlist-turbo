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

### Sheet-like modals

Use routes + `Stack.Screen` `presentation: "formSheet"` for anything that is a
"screen-ish" surface (list pickers, detail sheets, saved-by, etc.) rather than
a `react-native` `<Modal>`. Put these screens under the `src/app/(modals)/`
group and spread `defaultSheetOptions` from `~/utils/modalOptions` so every
sheet looks the same (native header + grabber + rounded corners). Register
each screen in `src/app/_layout.tsx` with `<Stack.Screen name="(modals)/..." />`.

The one exception is alert-style overlay dialogs (confirmation prompts,
username/code capture) — those stay on `react-native` `<Modal>` with a
transparent, fade presentation.

## Development

- Each developer needs a personal ngrok edge (see root README.md)
- E2E tests use Maestro (`.maestro/` directory)
- Run tests: `pnpm test`

## Push Notifications

OneSignal handles push notifications.
