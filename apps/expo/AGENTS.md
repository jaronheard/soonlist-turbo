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

## Development

- Each developer needs a personal ngrok edge (see root README.md)
- E2E tests use Maestro (`.maestro/` directory)
- Run tests: `pnpm test`
- For Expo package additions/upgrades, run `npx expo install <package>` in `apps/expo` first to select the SDK-compatible version, then keep `apps/expo/package.json` on `catalog:` specs.

## Push Notifications

OneSignal handles push notifications.
