---
name: sim-open
allowed-tools: Bash
description: Open this worktree's Expo dev-client URL in its dedicated iOS sim
---

Boot this worktree's persisted simulator and deep-link it to this worktree's Metro server. Run after `/start-dev`.

```bash
WORKTREE_PATH=$(git rev-parse --show-toplevel)
cd "$WORKTREE_PATH" || exit 1

if [[ ! -f .claude/.worktree-ports ]] || ! grep -q '^SIMULATOR_UDID=' .claude/.worktree-ports; then
  bash .claude/worktree-bootstrap.sh
fi

source .claude/.worktree-ports

if [[ -z "${SIMULATOR_UDID:-}" || -z "${METRO_PORT:-}" ]]; then
  echo "Missing SIMULATOR_UDID or METRO_PORT in .claude/.worktree-ports" >&2
  exit 1
fi

xcrun simctl boot "$SIMULATOR_UDID" 2>/dev/null || true
xcrun simctl openurl "$SIMULATOR_UDID" "exp+timetimecc://expo-development-client/?url=http://localhost:$METRO_PORT"

echo "Opened ${SIMULATOR_NAME:-$SIMULATOR_UDID} on Metro http://localhost:$METRO_PORT"
echo "Use iOS Simulator MCP for screenshot, ui_view, and ui_describe_all."
```
