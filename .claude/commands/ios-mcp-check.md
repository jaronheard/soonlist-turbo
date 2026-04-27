---
name: ios-mcp-check
allowed-tools: Bash
description: Check this worktree's iOS Simulator MCP prerequisites
---

Run the shell check first:

```bash
WORKTREE_PATH=$(git rev-parse --show-toplevel)
cd "$WORKTREE_PATH" || exit 1

if [[ ! -f .claude/.worktree-ports ]] || ! grep -q '^SIMULATOR_UDID=' .claude/.worktree-ports; then
  bash .claude/worktree-bootstrap.sh
fi

source .claude/.worktree-ports

if [[ -z "${SIMULATOR_UDID:-}" ]]; then
  echo "Missing SIMULATOR_UDID in .claude/.worktree-ports" >&2
  exit 1
fi

IDB_PATH=${IOS_SIMULATOR_MCP_IDB_PATH:-$(command -v idb 2>/dev/null || true)}

printf 'worktree: %s\n' "$WORKTREE_PATH"
printf 'simulator: %s (%s)\n' "${SIMULATOR_NAME:-unknown}" "$SIMULATOR_UDID"
printf 'metro: http://localhost:%s\n' "${METRO_PORT:-unknown}"
printf 'idb: %s\n' "${IDB_PATH:-not found}"

[[ -n "$IDB_PATH" && -x "$IDB_PATH" ]] || { echo "idb is missing or not executable; install idb or set IOS_SIMULATOR_MCP_IDB_PATH" >&2; exit 1; }
test -f .mcp.json || { echo ".mcp.json is missing; the committed MCP wrapper config is required" >&2; exit 1; }
xcrun simctl list devices available | grep -q "($SIMULATOR_UDID)" || { echo "Simulator UDID does not exist" >&2; exit 1; }
xcrun simctl boot "$SIMULATOR_UDID" 2>/dev/null || true

echo "Shell prerequisites passed."
echo "If iOS Simulator MCP tools are not available in an already-running session, restart Claude Code from this worktree."
```

Then verify the MCP server itself:

1. Call iOS Simulator MCP `screenshot` with `output_path` set to `/tmp/${SIMULATOR_NAME:-ios-sim}-mcp-check.png`.
2. Call iOS Simulator MCP `ui_describe_all`.
3. Confirm the accessibility tree is for the expected app after `/sim-open`.
