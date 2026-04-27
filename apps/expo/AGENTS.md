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

## Verifying UI changes

```
/start-dev
/sim-screenshot
Read the printed path
```

Each worktree gets a sim named `ws-<dir>`, cloned from your booted iPhone 16e on first run and deep-linked to that worktree's Metro. Multiple worktrees run independent sims in parallel — no shared MCP tunnel, no shared device. Clean up with `xcrun simctl delete ws-<dir>`.

For testID-aware tapping the `expo-mcp` server is still available (single-client; needs `/mcp` to reconnect). Not needed for screenshots.

## Push Notifications

OneSignal handles push notifications.
