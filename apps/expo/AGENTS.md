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

### Full-screen sheets / modals

**Never use `<Modal presentationStyle="pageSheet">`.** It's laggy, doesn't compose with navigation state, and behaves oddly on dismiss. There are no exceptions.

For anything that conceptually navigates to a new surface (settings panels, list managers, discovery screens, attribution sheets), build it as an Expo Router screen with `presentation: "modal"` (or `formSheet`) registered in `app/_layout.tsx`. Push it with `router.push("/...")` and dismiss with `router.back()`. The new route fetches its own data — pass an id in the URL, refetch via Convex.

For inline UI controls (pickers like `PlatformSelectNative` / `TimezoneSelectNative`, confirmation dialogs, transient overlays), `<Modal presentationStyle="overFullScreen">` with a centered popup + dimmed backdrop is the pattern. Component-state driven, doesn't take over the screen.

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

The committed root `.mcp.json` starts `.claude/mcp/ios-simulator.sh`, which runs bootstrap silently, reads `.claude/.worktree-ports`, and pins iOS Simulator MCP to that worktree's `SIMULATOR_UDID`. Use iOS Simulator MCP for screenshots, compressed views, accessibility reads, taps, typing, and swipes. `/sim-open` only boots the simulator and opens this worktree's Expo dev-client URL.

Fresh simulator clones must have the Soonlist Expo dev client installed before `/sim-open` deep links can resolve. `/sim-open` first tries to install `com.soonlist.app.dev` from another simulator that already has it, then from a local `apps/expo/ios/**/*.app` build artifact. If none exists and `/sim-open` fails with LaunchServices `-10814`, build the dev client for that simulator, then rerun `/sim-open`.

Expo MCP is not the parallel-safe path for simulator automation. It can still be useful for single-client experiments, but screenshot and accessibility testing should use iOS Simulator MCP.

If MCP tools are missing in a session that was already running before this config existed, restart Claude Code from the worktree folder. To clean up a simulator, run `source .claude/.worktree-ports && xcrun simctl delete "$SIMULATOR_UDID"`, then rerun bootstrap or start a new session.

## Push Notifications

OneSignal handles push notifications.
