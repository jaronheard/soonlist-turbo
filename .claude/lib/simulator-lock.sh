#!/usr/bin/env bash
# Shared simulator lock helpers. Source this file from commands that touch the
# iOS Simulator so autonomous worktrees do not steal foreground, screenshots,
# or accessibility focus from each other.

sim_lock_worktree_root() {
  git rev-parse --show-toplevel 2>/dev/null || pwd
}

sim_lock_main_checkout() {
  local main_checkout
  main_checkout=$(git worktree list --porcelain | awk '/^worktree /{sub(/^worktree /, ""); print; exit}')
  printf '%s\n' "${main_checkout:-$(sim_lock_worktree_root)}"
}

sim_lock_dir() {
  printf '%s/.claude/.simulator.lock\n' "$(sim_lock_main_checkout)"
}

sim_lock_info_file() {
  printf '%s/info\n' "$(sim_lock_dir)"
}

sim_lock_read_field() {
  local field=$1
  local info_file
  info_file=$(sim_lock_info_file)
  [[ -f "$info_file" ]] || return 1
  awk -F= -v field="$field" '$1 == field {print substr($0, length(field) + 2); exit}' "$info_file"
}

sim_lock_pid_alive() {
  local pid=$1
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

sim_lock_age_seconds() {
  local started_at now
  started_at=$(sim_lock_read_field STARTED_AT_EPOCH 2>/dev/null || true)
  [[ -n "$started_at" ]] || return 1
  now=$(date +%s)
  printf '%s\n' "$((now - started_at))"
}

sim_lock_clear_if_stale() {
  local lock_dir pid age stale_after
  lock_dir=$(sim_lock_dir)
  [[ -d "$lock_dir" ]] || return 0

  pid=$(sim_lock_read_field PID 2>/dev/null || true)
  if ! sim_lock_pid_alive "$pid"; then
    rm -rf "$lock_dir"
    return 0
  fi

  stale_after=${SIMULATOR_LOCK_STALE_SECONDS:-7200}
  age=$(sim_lock_age_seconds 2>/dev/null || echo 0)
  if [[ "$age" -gt "$stale_after" ]]; then
    rm -rf "$lock_dir"
  fi
}

sim_lock_acquire() {
  local command=${1:-simulator}
  local wait_seconds=${SIMULATOR_LOCK_WAIT_SECONDS:-0}
  local deadline now lock_dir info_file worktree_root
  lock_dir=$(sim_lock_dir)
  info_file=$(sim_lock_info_file)
  worktree_root=$(sim_lock_worktree_root)
  deadline=$(($(date +%s) + wait_seconds))

  mkdir -p "$(dirname "$lock_dir")"

  while true; do
    sim_lock_clear_if_stale
    if mkdir "$lock_dir" 2>/dev/null; then
      {
        printf 'PID=%s\n' "$$"
        printf 'COMMAND=%s\n' "$command"
        printf 'WORKTREE=%s\n' "$worktree_root"
        printf 'STARTED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        printf 'STARTED_AT_EPOCH=%s\n' "$(date +%s)"
      } > "$info_file"
      trap sim_lock_release EXIT INT TERM
      return 0
    fi

    now=$(date +%s)
    if [[ "$now" -ge "$deadline" ]]; then
      echo "Simulator is already in use:" >&2
      sim_lock_status >&2 || true
      echo "Wait for that task to finish, or retry with SIMULATOR_LOCK_WAIT_SECONDS=<seconds>." >&2
      return 1
    fi
    sleep 1
  done
}

sim_lock_release() {
  local lock_dir pid
  lock_dir=$(sim_lock_dir)
  pid=$(sim_lock_read_field PID 2>/dev/null || true)
  if [[ "$pid" == "$$" ]]; then
    rm -rf "$lock_dir"
  fi
}

sim_lock_status() {
  local lock_dir info_file pid age
  lock_dir=$(sim_lock_dir)
  info_file=$(sim_lock_info_file)
  if [[ ! -d "$lock_dir" || ! -f "$info_file" ]]; then
    echo "Simulator lock is free."
    return 0
  fi

  pid=$(sim_lock_read_field PID 2>/dev/null || true)
  age=$(sim_lock_age_seconds 2>/dev/null || echo "?")
  echo "Simulator lock is held."
  echo "  command:  $(sim_lock_read_field COMMAND 2>/dev/null || echo unknown)"
  echo "  worktree: $(sim_lock_read_field WORKTREE 2>/dev/null || echo unknown)"
  echo "  pid:      ${pid:-unknown}"
  echo "  started:  $(sim_lock_read_field STARTED_AT 2>/dev/null || echo unknown)"
  echo "  age:      ${age}s"
  if ! sim_lock_pid_alive "$pid"; then
    echo "  stale:    pid is no longer running"
  fi
}

sim_lock_target_udid() {
  local udid
  udid=${SIMULATOR_UDID:-}
  if [[ -n "$udid" ]]; then
    printf '%s\n' "$udid"
    return 0
  fi

  udid=$(xcrun simctl list devices booted 2>/dev/null | awk '/iPhone/ && match($0, /\([0-9A-F-]{36}\)/) { print substr($0, RSTART + 1, RLENGTH - 2); exit }')
  if [[ -n "$udid" ]]; then
    printf '%s\n' "$udid"
    return 0
  fi

  xcrun simctl list devices available 2>/dev/null | awk '/iPhone/ && match($0, /\([0-9A-F-]{36}\)/) { print substr($0, RSTART + 1, RLENGTH - 2); exit }'
}
