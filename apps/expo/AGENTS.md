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
/sim-open
Use iOS Simulator MCP screenshot, ui_view, or ui_describe_all
```

Each Claude worktree gets a dedicated simulator named `ws-<dir>` and a dedicated Metro port. The assignment is persisted in `.claude/.worktree-ports`:

```
METRO_PORT=...
SIMULATOR_NAME=...
SIMULATOR_UDID=...
```

The worktree bootstrap also generates root `.mcp.json` so iOS Simulator MCP is pinned to that worktree's `SIMULATOR_UDID`. Use iOS Simulator MCP for screenshots, compressed views, accessibility reads, taps, typing, and swipes. `/sim-open` only boots the simulator and opens this worktree's Expo dev-client URL.

Expo MCP is not the parallel-safe path for simulator automation. It can still be useful for single-client experiments, but screenshot and accessibility testing should use iOS Simulator MCP.

If MCP tools are missing or stale after bootstrap, run `/mcp` reconnect or restart Claude Code from the worktree folder. To clean up a simulator, run `source .claude/.worktree-ports && xcrun simctl delete "$SIMULATOR_UDID"`, then rerun bootstrap or start a new session.

## Push Notifications

OneSignal handles push notifications.
