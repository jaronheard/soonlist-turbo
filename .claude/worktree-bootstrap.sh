#!/usr/bin/env bash
# Shared worktree bootstrap: port allocation, env copy from main checkout,
# launch.json, pnpm install. Used by Cursor (.cursor/worktrees.json) and by
# the Claude SessionStart hook (.claude/hooks/worktree-init.sh).

set -uo pipefail

WORKTREE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
# Resolve the main checkout (first entry in `git worktree list`).
# Use sub() instead of $2 so paths containing spaces aren't truncated.
MAIN_CHECKOUT=$(git worktree list --porcelain | awk '/^worktree /{sub(/^worktree /, ""); print; exit}')
if [[ -z "$MAIN_CHECKOUT" ]] || [[ -z "$WORKTREE_ROOT" ]] || [[ "$MAIN_CHECKOUT" == "$WORKTREE_ROOT" ]]; then
  echo "worktree-bootstrap: not a linked worktree or could not resolve main checkout, skipping" >&2
  exit 0
fi

cd "$WORKTREE_ROOT" || { echo "worktree-bootstrap: cd to $WORKTREE_ROOT failed, skipping" >&2; exit 0; }
WORKTREE_NAME=$(basename "$WORKTREE_ROOT")

# Determine port assignment. On first run, allocate; on subsequent runs, reuse
# the persisted ports from .claude/.worktree-ports so dev servers, .env.local,
# and launch.json never drift out of sync with each other.
MARKER=".claude/.worktree-ports"

WEB_PORT=""
METRO_PORT=""
if [[ -f "$MARKER" ]]; then
  while IFS='=' read -r k v; do
    case "$k" in
      WEB_PORT)   WEB_PORT=$v ;;
      METRO_PORT) METRO_PORT=$v ;;
    esac
  done < "$MARKER"
fi

persist_marker() {
  mkdir -p .claude
  {
    printf 'WEB_PORT=%s\n' "$WEB_PORT"
    printf 'METRO_PORT=%s\n' "$METRO_PORT"
  } > "$MARKER"
}

if [[ -z "$WEB_PORT" || -z "$METRO_PORT" ]]; then
  # First-time allocation. Acquire a cross-worktree lock, enumerate siblings,
  # probe for a pair that's neither claimed nor listening, then persist.
  START_OFFSET=$(printf '%s' "$WORKTREE_NAME" | cksum | awk '{print ($1 % 99) + 1}')

  port_free() {
    ! (exec 3<>/dev/tcp/127.0.0.1/"$1") 2>/dev/null
  }

  LOCK_DIR="$MAIN_CHECKOUT/.claude/.worktree-ports.lock"
  mkdir -p "$(dirname "$LOCK_DIR")"
  lock_acquired=false
  for _ in $(seq 1 50); do
    if mkdir "$LOCK_DIR" 2>/dev/null; then
      lock_acquired=true
      trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT
      break
    fi
    sleep 0.1
  done
  if ! $lock_acquired; then
    echo "worktree-bootstrap: could not acquire port-allocation lock, proceeding without it" >&2
  fi

  assigned_web=" "
  assigned_metro=" "
  while IFS= read -r wt_path; do
    [[ -z "$wt_path" ]] && continue
    [[ "$wt_path" == "$WORKTREE_ROOT" ]] && continue
    sibling_marker="$wt_path/.claude/.worktree-ports"
    [[ -f "$sibling_marker" ]] || continue
    while IFS='=' read -r k v; do
      case "$k" in
        WEB_PORT)   assigned_web+="$v " ;;
        METRO_PORT) assigned_metro+="$v " ;;
      esac
    done < "$sibling_marker"
  done < <(git worktree list --porcelain | awk '/^worktree /{sub(/^worktree /, ""); print}')

  web_claimable()   { case "$assigned_web"   in *" $1 "*) return 1 ;; esac; port_free "$1"; }
  metro_claimable() { case "$assigned_metro" in *" $1 "*) return 1 ;; esac; port_free "$1"; }

  PORT_OFFSET=""
  for i in $(seq 0 98); do
    offset=$(( (START_OFFSET - 1 + i) % 99 + 1 ))
    if web_claimable $((3000 + offset)) && metro_claimable $((8081 + offset)); then
      PORT_OFFSET=$offset
      break
    fi
  done
  if [[ -z "$PORT_OFFSET" ]]; then
    echo "worktree-bootstrap: no unclaimed free port pair; falling back to hash offset" >&2
    PORT_OFFSET=$START_OFFSET
  fi
  WEB_PORT=$((3000 + PORT_OFFSET))
  METRO_PORT=$((8081 + PORT_OFFSET))

  persist_marker
  echo "worktree-bootstrap: allocated ports — web=${WEB_PORT}, metro=${METRO_PORT}" >&2

  if $lock_acquired; then
    rmdir "$LOCK_DIR" 2>/dev/null || true
    lock_acquired=false
    trap - EXIT
  fi
else
  echo "worktree-bootstrap: reusing persisted ports — web=${WEB_PORT}, metro=${METRO_PORT}" >&2
  persist_marker
fi

# Copy env files from main checkout (only if missing locally).
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
  echo "worktree-bootstrap: copied env files: ${copied[*]}" >&2
fi

# Rewrite ports in env files. sed is idempotent (no "localhost:3000" left to
# match after the first rewrite), so running every session ensures env files
# copied AFTER the first init also get their ports rewritten.
for rel in .env.local apps/expo/.env apps/web/.env.local; do
  [[ -f "$rel" ]] || continue
  sed -i.bak \
    -e "s|localhost:3000|localhost:${WEB_PORT}|g" \
    -e "s|127\.0\.0\.1:3000|127.0.0.1:${WEB_PORT}|g" \
    -e "s|localhost:8081|localhost:${METRO_PORT}|g" \
    -e "s|127\.0\.0\.1:8081|127.0.0.1:${METRO_PORT}|g" \
    "$rel"
  rm -f "$rel.bak"
done

# Append PORT/RCT_METRO_PORT to .env.local if not already present. Sentinel
# comment lets us detect our prior append independently of any PORT= line
# the user or upstream may have set themselves.
if [[ -f .env.local ]] && ! grep -q "^# worktree-ports" .env.local; then
  {
    echo ""
    echo "# worktree-ports (auto-generated by .claude/worktree-bootstrap.sh)"
    echo "PORT=${WEB_PORT}"
    echo "RCT_METRO_PORT=${METRO_PORT}"
  } >> .env.local
fi

# Generate .claude/launch.json from the committed template on every run.
# Safe to repeat because the output is deterministic for a given port pair,
# and the file is gitignored so local regeneration can't pollute commits or
# hide upstream changes (which now land in launch.json.example).
if [[ -f .claude/launch.json.example ]]; then
  sed \
    -e "s|\"port\": 3000|\"port\": ${WEB_PORT}|g" \
    -e "s|\"port\": 8081|\"port\": ${METRO_PORT}|g" \
    .claude/launch.json.example > .claude/launch.json
fi

# Install deps if missing
if [[ ! -d node_modules && "${WORKTREE_BOOTSTRAP_SKIP_INSTALL:-0}" != "1" ]]; then
  echo "worktree-bootstrap: running pnpm install" >&2
  pnpm install >&2 || echo "worktree-bootstrap: pnpm install failed (non-fatal)" >&2
fi

echo "✅ Worktree initialized at $WORKTREE_ROOT"
echo "   web:   http://localhost:${WEB_PORT}"
echo "   metro: http://localhost:${METRO_PORT}"
