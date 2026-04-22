#!/usr/bin/env bash
# Initializes a Claude Code worktree: copies env files from the main checkout
# and installs dependencies. Runs on SessionStart (startup).
#
# Safe in the main checkout — only acts when running inside a worktree under
# .claude/worktrees/. Logs are informational; failures are non-fatal so a
# broken hook can't block a session from starting.

set -uo pipefail

# Only run inside a Claude worktree
WORKTREE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
if [[ -z "$WORKTREE_ROOT" ]] || [[ "$WORKTREE_ROOT" != *".claude/worktrees/"* ]]; then
  exit 0
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec bash "$REPO_ROOT/.claude/worktree-bootstrap.sh"
