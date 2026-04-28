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
/sim-screenshot
Read the printed path
```

Each Claude worktree gets a dedicated Metro port. The assignment is persisted in `.claude/.worktree-ports`:

```
METRO_PORT=...
```

Simulator testing is intentionally serialized. Commands that touch the iOS Simulator acquire a shared lock at the main checkout's `.claude/.simulator.lock`, then release it when they finish. If another agent is using the simulator, wait and retry later; `/sim-lock-status` shows the current lock holder.

`/sim-open` and `/sim-screenshot` use the first booted iPhone simulator, or the first available iPhone simulator if none is booted. Set `SIMULATOR_UDID` before running a command to force a specific shared simulator.

Expo MCP and iOS Simulator MCP are not the parallel-safe path here unless the caller also holds the simulator lock. Prefer `/sim-screenshot` for screenshot verification.

## Push Notifications

OneSignal handles push notifications.
