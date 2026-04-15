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

# Resolve the main checkout (first entry in `git worktree list`).
# Use sub() instead of $2 so paths containing spaces aren't truncated.
MAIN_CHECKOUT=$(git worktree list --porcelain | awk '/^worktree /{sub(/^worktree /, ""); print; exit}')
if [[ -z "$MAIN_CHECKOUT" ]] || [[ "$MAIN_CHECKOUT" == "$WORKTREE_ROOT" ]]; then
  echo "worktree-init: could not resolve main checkout, skipping" >&2
  exit 0
fi

cd "$WORKTREE_ROOT"

# Copy env files from main checkout (only if missing locally)
copied=()
for rel in .env .env.local .env.preview .env.production apps/expo/.env apps/web/.env.local; do
  src="$MAIN_CHECKOUT/$rel"
  dst="./$rel"
  if [[ -f "$src" && ! -f "$dst" ]]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    copied+=("$rel")
  fi
done

if [[ ${#copied[@]} -gt 0 ]]; then
  echo "worktree-init: copied env files: ${copied[*]}" >&2
fi

# Install deps if missing
if [[ ! -d node_modules ]]; then
  echo "worktree-init: running pnpm install" >&2
  pnpm install >&2 || echo "worktree-init: pnpm install failed (non-fatal)" >&2
fi

echo "✅ Worktree initialized at $WORKTREE_ROOT"
