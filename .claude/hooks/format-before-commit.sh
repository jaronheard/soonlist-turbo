#!/usr/bin/env bash
# PreToolUse:Bash hook — runs `pnpm format:fix` at repo root before any
# `git commit` and re-stages files that were already staged. Idempotent;
# turbo + prettier caches make warm runs ~1s.
#
# Design goals: match CI exactly (same command CI runs in check mode),
# never let an unformatted file reach a commit, never clobber unrelated work.

set -u

input=$(cat)
cmd=$(printf '%s' "$input" | /usr/bin/python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("tool_input",{}).get("command",""))
except: pass' 2>/dev/null || true)

# Only act on actual `git commit` invocations at a shell command position
# (start of line or after a command separator like ; && || |).
if ! [[ "$cmd" =~ (^|[;\&\|])[[:space:]]*git[[:space:]]+commit([[:space:]]|$) ]]; then
  exit 0
fi

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

# Snapshot what's staged so we know what to re-add after formatting.
mapfile -t staged < <(git diff --cached --name-only --diff-filter=ACMR)

# Guard: if any staged file ALSO has unstaged changes (partial staging via
# `git add -p`), abort. Re-staging with `git add <file>` would pull the
# unstaged hunks into the commit — silently changing its contents.
mapfile -t unstaged < <(git diff --name-only)
partial=()
for s in "${staged[@]}"; do
  for u in "${unstaged[@]}"; do
    [ "$s" = "$u" ] && partial+=("$s")
  done
done
if [ ${#partial[@]} -gt 0 ]; then
  echo "[format-hook] partial staging detected — aborting to avoid clobbering unstaged hunks:" >&2
  printf '  - %s\n' "${partial[@]}" >&2
  echo "[format-hook] run 'pnpm format:fix', stage the formatted files as you want them, then re-commit." >&2
  exit 2
fi

# Run the canonical command. CI runs `pnpm format` (check); we run the
# write version. Same turbo task, same prettier config, same cache file.
if ! pnpm format:fix >&2 2>&1; then
  echo "[format-hook] pnpm format:fix failed — aborting commit" >&2
  exit 2
fi

# Re-stage files that were already in the index if prettier touched them.
# Files prettier touched that weren't staged are left unstaged on purpose
# (they weren't part of this commit).
for f in "${staged[@]}"; do
  [ -f "$f" ] && git add -- "$f"
done

exit 0
