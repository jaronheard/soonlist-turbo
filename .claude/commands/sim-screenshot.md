---
name: sim-screenshot
allowed-tools: Bash
description: Screenshot this worktree in the shared iOS sim
---

Acquire the shared simulator lock, open this worktree's Expo dev-client URL, and save a screenshot. Run after `/start-dev`.

```bash
WORKTREE_PATH=$(git rev-parse --show-toplevel)
cd "$WORKTREE_PATH" || exit 1

if [[ ! -f .claude/.worktree-ports ]]; then
  bash .claude/worktree-bootstrap.sh
fi

REQUESTED_SIMULATOR_UDID=${SIMULATOR_UDID:-}
source .claude/.worktree-ports
if [[ -n "$REQUESTED_SIMULATOR_UDID" ]]; then
  export SIMULATOR_UDID="$REQUESTED_SIMULATOR_UDID"
else
  unset SIMULATOR_UDID
fi
source .claude/lib/simulator-lock.sh

if [[ -z "${METRO_PORT:-}" ]]; then
  echo "Missing METRO_PORT in .claude/.worktree-ports" >&2
  exit 1
fi

sim_lock_acquire sim-screenshot || exit 1

SIMULATOR_TARGET_UDID=$(sim_lock_target_udid)
if [[ -z "$SIMULATOR_TARGET_UDID" ]]; then
  echo "No available iPhone simulator found." >&2
  exit 1
fi

xcrun simctl boot "$SIMULATOR_TARGET_UDID" 2>/dev/null || true
xcrun simctl openurl "$SIMULATOR_TARGET_UDID" "exp+timetimecc://expo-development-client/?url=http://localhost:$METRO_PORT"
sleep 5

OUT="/tmp/$(basename "$WORKTREE_PATH")-sim-$(date +%s).png"
xcrun simctl io "$SIMULATOR_TARGET_UDID" screenshot "$OUT"
echo "$OUT"
```
