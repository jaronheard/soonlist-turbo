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

When you change a screen, verify it on the booted iOS Simulator (iPhone 16e) before reporting the task done — don't refuse with "I can't see the screen."

The `expo-mcp` HTTP server is registered for this project in `~/.claude.json`. The local `expo-mcp` dev dependency (in `apps/expo`) plus `EXPO_UNSTABLE_MCP_SERVER=1` (already set by the `dev` and `dev:ios` scripts) makes Metro expose screenshot, tap, and view-inspection tools through that MCP. After (re)starting Metro, run `/mcp` in your Claude session to reconnect — Expo's recommendation, since the local capability set changes when the dev server restarts.

1. `pnpm dev:expo` from the repo root (Metro defaults to port 8081; check the Metro log line if overridden).
2. Run `/mcp` to authenticate / reconnect.
3. Screenshot the affected screen and confirm the change rendered.
4. Exercise the golden path plus at least one edge case.

If the MCP is genuinely unreachable (auth failed, no booted simulator, Metro down), say so explicitly rather than claiming success. Requires macOS host and Expo SDK ≥ 54.

## Push Notifications

OneSignal handles push notifications.
