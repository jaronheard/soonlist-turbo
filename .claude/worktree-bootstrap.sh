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
# launch.json, simulator assignment, and .mcp.json never drift out of sync.
MARKER=".claude/.worktree-ports"

WEB_PORT=""
METRO_PORT=""
SIMULATOR_NAME=""
SIMULATOR_UDID=""
if [[ -f "$MARKER" ]]; then
  while IFS='=' read -r k v; do
    case "$k" in
      WEB_PORT)   WEB_PORT=$v ;;
      METRO_PORT) METRO_PORT=$v ;;
      SIMULATOR_NAME) SIMULATOR_NAME=$v ;;
      SIMULATOR_UDID) SIMULATOR_UDID=$v ;;
    esac
  done < "$MARKER"
fi

persist_marker() {
  mkdir -p .claude
  {
    printf 'WEB_PORT=%s\n' "$WEB_PORT"
    printf 'METRO_PORT=%s\n' "$METRO_PORT"
    [[ -n "$SIMULATOR_NAME" ]] && printf 'SIMULATOR_NAME=%s\n' "$SIMULATOR_NAME"
    [[ -n "$SIMULATOR_UDID" ]] && printf 'SIMULATOR_UDID=%s\n' "$SIMULATOR_UDID"
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
fi

# Allocate a dedicated iOS simulator for this worktree. This keeps parallel
# Claude agents from fighting over installs, foreground state, screenshots, and
# accessibility reads. Simulator allocation is best-effort so bootstrap remains
# usable on machines without Xcode/CoreSimulator available.
SIMULATOR_NAME=${SIMULATOR_NAME:-"ws-${WORKTREE_NAME}"}

simctl_list_available() {
  xcrun simctl list devices available 2>/dev/null
}

sim_udid_exists() {
  [[ -n "$1" ]] && simctl_list_available | grep -q "($1)"
}

sim_udid_for_name() {
  local name=$1
  simctl_list_available | awk -v name="$name" '
    index($0, "    " name " (") == 1 {
      if (match($0, /\([0-9A-F-]{36}\)/)) {
        print substr($0, RSTART + 1, RLENGTH - 2)
        exit
      }
    }
  '
}

sim_clone_source_udid() {
  {
    xcrun simctl list devices booted 2>/dev/null
    simctl_list_available
  } | awk '
    /iPhone/ && match($0, /\([0-9A-F-]{36}\)/) {
      print substr($0, RSTART + 1, RLENGTH - 2)
      exit
    }
  '
}

if simctl_list_available >/dev/null; then
  if ! sim_udid_exists "$SIMULATOR_UDID"; then
    existing_udid=$(sim_udid_for_name "$SIMULATOR_NAME")
    if [[ -n "$existing_udid" ]]; then
      SIMULATOR_UDID=$existing_udid
      echo "worktree-bootstrap: reusing simulator ${SIMULATOR_NAME} (${SIMULATOR_UDID})" >&2
    else
      source_udid=$(sim_clone_source_udid)
      if [[ -n "$source_udid" ]]; then
        clone_output=$(xcrun simctl clone "$source_udid" "$SIMULATOR_NAME" 2>/dev/null || true)
        cloned_udid=$(printf '%s\n' "$clone_output" | grep -Eo '[0-9A-F-]{36}' | head -1)
        SIMULATOR_UDID=${cloned_udid:-$(sim_udid_for_name "$SIMULATOR_NAME")}
        if [[ -n "$SIMULATOR_UDID" ]]; then
          echo "worktree-bootstrap: allocated simulator ${SIMULATOR_NAME} (${SIMULATOR_UDID})" >&2
        else
          SIMULATOR_UDID=""
          echo "worktree-bootstrap: cloned ${SIMULATOR_NAME}, but could not resolve its UDID" >&2
        fi
      else
        SIMULATOR_UDID=""
        echo "worktree-bootstrap: no iPhone simulator found to clone; skipping simulator allocation" >&2
      fi
    fi
  else
    echo "worktree-bootstrap: reusing simulator ${SIMULATOR_NAME} (${SIMULATOR_UDID})" >&2
  fi
  persist_marker
else
  echo "worktree-bootstrap: simctl unavailable; skipping simulator allocation" >&2
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

# Generate a worktree-local Claude Code MCP config. Sessions are launched from
# the worktree root, so this pins iOS Simulator MCP to the simulator allocated
# above without relying on global MCP state.
if [[ -n "$SIMULATOR_UDID" ]]; then
  IDB_PATH=${IOS_SIMULATOR_MCP_IDB_PATH:-$(command -v idb 2>/dev/null || true)}
  IDB_PATH_LINE=""
  if [[ -n "$IDB_PATH" ]]; then
    IDB_PATH_LINE=",
        \"IOS_SIMULATOR_MCP_IDB_PATH\": \"${IDB_PATH}\""
  fi
  cat > .mcp.json <<EOF
{
  "mcpServers": {
    "ios-simulator": {
      "command": "npx",
      "args": ["-y", "ios-simulator-mcp"],
      "env": {
        "IDB_UDID": "${SIMULATOR_UDID}",
        "IOS_SIMULATOR_MCP_DEFAULT_OUTPUT_DIR": "/tmp"${IDB_PATH_LINE}
      }
    }
  }
}
EOF
else
  rm -f .mcp.json
fi

# Install deps if missing
if [[ ! -d node_modules ]]; then
  echo "worktree-bootstrap: running pnpm install" >&2
  pnpm install >&2 || echo "worktree-bootstrap: pnpm install failed (non-fatal)" >&2
fi

echo "✅ Worktree initialized at $WORKTREE_ROOT"
echo "   web:   http://localhost:${WEB_PORT}"
echo "   metro: http://localhost:${METRO_PORT}"
if [[ -n "$SIMULATOR_UDID" ]]; then
  echo "   sim:   ${SIMULATOR_NAME} (${SIMULATOR_UDID})"
fi
