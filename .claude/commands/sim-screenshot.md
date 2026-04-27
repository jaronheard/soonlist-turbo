---
name: sim-screenshot
allowed-tools: Bash
description: Screenshot this worktree's dedicated iOS sim, deep-linked to its Metro
---

One sim per worktree (`ws-<dir>`), cloned from a booted iPhone 16e on first run. Run after `/start-dev`, then `Read` the printed path.

```bash
SIM="ws-$(basename "$PWD")"
PORT=$(grep ^RCT_METRO_PORT .env.local | cut -d= -f2)
if ! xcrun simctl list devices | grep -q " $SIM ("; then
  SRC=$(xcrun simctl list devices booted | grep "iPhone 16e" | head -1 | grep -oE "[0-9A-F-]{36}")
  xcrun simctl clone "$SRC" "$SIM"
fi
xcrun simctl boot "$SIM" 2>/dev/null || true
xcrun simctl openurl "$SIM" "exp+timetimecc://expo-development-client/?url=http://localhost:$PORT"
sleep 5
OUT="/tmp/$SIM-$(date +%s).png"
xcrun simctl io "$SIM" screenshot "$OUT"
echo "$OUT"
```

If the screenshot shows the dev launcher, re-run. To clean up: `xcrun simctl delete "$SIM"`.
