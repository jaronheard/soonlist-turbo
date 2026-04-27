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

DEV_CLIENT_BUNDLE_ID=${DEV_CLIENT_BUNDLE_ID:-com.soonlist.app.dev}

dev_client_installed() {
  xcrun simctl get_app_container "$SIMULATOR_UDID" "$DEV_CLIENT_BUNDLE_ID" app >/dev/null 2>&1
}

find_installed_dev_client() {
  while IFS= read -r candidate_udid; do
    [[ "$candidate_udid" == "$SIMULATOR_UDID" ]] && continue
    app_path=$(xcrun simctl get_app_container "$candidate_udid" "$DEV_CLIENT_BUNDLE_ID" app 2>/dev/null || true)
    if [[ -n "$app_path" && -d "$app_path" ]]; then
      printf '%s\n' "$app_path"
      return 0
    fi
  done < <(xcrun simctl list devices available | awk '/iPhone/ && match($0, /\([0-9A-F-]{36}\)/) { print substr($0, RSTART + 1, RLENGTH - 2) }')
  return 1
}

find_built_dev_client() {
  while IFS= read -r candidate_app; do
    bundle_id=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$candidate_app/Info.plist" 2>/dev/null || true)
    if [[ "$bundle_id" == "$DEV_CLIENT_BUNDLE_ID" ]]; then
      printf '%s\n' "$candidate_app"
      return 0
    fi
  done < <(find apps/expo/ios -path '*.app' -type d 2>/dev/null)
  return 1
}

xcrun simctl boot "$SIMULATOR_UDID" 2>/dev/null || true

if ! dev_client_installed; then
  SOURCE_APP=$(find_installed_dev_client || true)
  SOURCE_APP=${SOURCE_APP:-$(find_built_dev_client || true)}
  if [[ -n "$SOURCE_APP" ]]; then
    xcrun simctl install "$SIMULATOR_UDID" "$SOURCE_APP"
  fi
fi

if ! xcrun simctl openurl "$SIMULATOR_UDID" "exp+timetimecc://expo-development-client/?url=http://localhost:$METRO_PORT"; then
  echo "Could not open the Expo dev-client URL." >&2
  echo "No installed or built ${DEV_CLIENT_BUNDLE_ID} app was found to install automatically." >&2
  echo "Build the dev client for ${SIMULATOR_NAME:-$SIMULATOR_UDID}, then rerun /sim-open." >&2
  exit 1
fi

echo "Opened ${SIMULATOR_NAME:-$SIMULATOR_UDID} on Metro http://localhost:$METRO_PORT"
echo "Use iOS Simulator MCP for screenshot, ui_view, and ui_describe_all."
```
