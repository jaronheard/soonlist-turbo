#!/usr/bin/env bash
# Starts iOS Simulator MCP pinned to this worktree's simulator. This script is
# called by the committed root .mcp.json, so Claude Code can discover the MCP
# server before SessionStart hooks have generated worktree-local state.

set -euo pipefail

WORKTREE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
if [[ -n "$WORKTREE_ROOT" ]]; then
  cd "$WORKTREE_ROOT" || exit 1
fi

BOOTSTRAP_LOG="/tmp/$(basename "${WORKTREE_ROOT:-soonlist}")-mcp-bootstrap.log"
if [[ -f .claude/worktree-bootstrap.sh ]]; then
  WORKTREE_BOOTSTRAP_SKIP_INSTALL=1 bash .claude/worktree-bootstrap.sh >"$BOOTSTRAP_LOG" 2>&1
fi

if [[ -f .claude/.worktree-ports ]]; then
  # shellcheck disable=SC1091
  source .claude/.worktree-ports
fi

if [[ -n "${SIMULATOR_UDID:-}" ]]; then
  export IDB_UDID="$SIMULATOR_UDID"
else
  echo "ios-simulator MCP wrapper could not resolve SIMULATOR_UDID; see $BOOTSTRAP_LOG" >&2
  exit 1
fi

export IOS_SIMULATOR_MCP_DEFAULT_OUTPUT_DIR=${IOS_SIMULATOR_MCP_DEFAULT_OUTPUT_DIR:-/tmp}

if [[ -z "${IOS_SIMULATOR_MCP_IDB_PATH:-}" ]]; then
  IDB_PATH=$(command -v idb 2>/dev/null || true)
  if [[ -n "$IDB_PATH" ]]; then
    export IOS_SIMULATOR_MCP_IDB_PATH="$IDB_PATH"
  fi
fi

exec npx -y ios-simulator-mcp
