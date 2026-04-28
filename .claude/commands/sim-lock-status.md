---
name: sim-lock-status
allowed-tools: Bash
description: Show whether the shared iOS simulator lock is held
---

```bash
WORKTREE_PATH=$(git rev-parse --show-toplevel)
cd "$WORKTREE_PATH" || exit 1
source .claude/lib/simulator-lock.sh
sim_lock_clear_if_stale
sim_lock_status
```
