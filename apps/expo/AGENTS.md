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

How the chain works: the `expo-mcp` HTTP server (registered in your `~/.claude.json`) talks to a running Metro, which exposes screenshot, tap, and view-inspection tools because the `expo-mcp` dev dep is installed and the `dev` / `dev:ios` scripts set `EXPO_UNSTABLE_MCP_SERVER=1`. After (re)starting Metro, run `/mcp` in your Claude session to reconnect — Expo's recommendation, since the local capability set changes when the dev server restarts.

### One-time setup (per developer / agent environment)

`~/.claude.json` is per-user, so the MCP registration isn't checked into the repo. Run once from the project root you'll be working in:

```sh
claude mcp add --transport http --scope local expo-mcp https://mcp.expo.dev/mcp
```

Use `--scope user` instead if you want it registered once across every worktree/project on your machine. After registering, run `/mcp` in a Claude session to OAuth into Expo.

### Per session

1. **Make sure the dev stack is running.** Agent environments often start cold. The agent-friendly launch is two background processes from the repo root:
   - `pnpm dev:no-expo` — Convex/web/etc. via turbo (no TTY needed).
   - `pnpm dev:expo:ios` — Metro **plus** auto-launches the iOS simulator. This passes `--ios` to `expo start`, which is what avoids the interactive `i` keypress that the regular `pnpm dev:expo` would otherwise require — agents have no TTY to press keys in.
2. **Find the Metro port for the environment you're working in.** Each worktree gets its own port pair from [`.claude/worktree-bootstrap.sh`](../../.claude/worktree-bootstrap.sh). Check `.claude/.worktree-ports` (`METRO_PORT=`), `.env.local` (`RCT_METRO_PORT=`), or the SessionStart hook's `metro: http://localhost:<port>` log line. The main checkout defaults to `8081`.
3. Run `/mcp` to authenticate / reconnect.
4. Screenshot the affected screen and confirm the change rendered.
5. Exercise the golden path plus at least one edge case.

If the MCP is genuinely unreachable (auth failed, no booted simulator, Metro down), say so explicitly rather than claiming success. Requires macOS host and Expo SDK ≥ 54.

Humans normally launch `pnpm dev:expo` and press `i` themselves — that flow is unchanged. `pnpm dev:expo:ios` is the agent-only equivalent that skips the keypress.

## Push Notifications

OneSignal handles push notifications.
