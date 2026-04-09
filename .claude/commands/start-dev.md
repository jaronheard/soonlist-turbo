---
allowed-tools: Bash, Read
description: Start dev servers (Expo + everything else) in separate cmux tabs
---

# Start Development Servers

Start both development server groups in separate cmux terminal tabs so they run independently of Claude and don't get killed by background task timeouts.

## Instructions

Run these steps sequentially using the Bash tool. Do NOT run cmux commands in parallel — each surface must be created, renamed, and started before moving to the next.

1. **Install dependencies** (use absolute path so CWD stays at repo root):

   ```bash
   WORKTREE_PATH=$(git rev-parse --show-toplevel) && cd "$WORKTREE_PATH" && pnpm install
   ```

2. **Read the PORT from .env.local**:

   ```bash
   grep '^PORT=' .env.local | cut -d= -f2-
   ```

   If no PORT is set, default is 3000. Save the value for step 4's report.

3. **Create two terminal tabs and start each server group** — run this as a **single** Bash command. Never split into parallel Bash calls:

   ```bash
   set -e
   WORKTREE_PATH=$(git rev-parse --show-toplevel)
   NO_EXPO_SURFACE=$(cmux new-surface --type terminal 2>&1 | awk '{print $2}')
   cmux rename-tab --surface "$NO_EXPO_SURFACE" "dev:no-expo"
   cmux send --surface "$NO_EXPO_SURFACE" "cd $WORKTREE_PATH && PORT=$PORT pnpm dev:no-expo"$'\n'
   EXPO_SURFACE=$(cmux new-surface --type terminal 2>&1 | awk '{print $2}')
   cmux rename-tab --surface "$EXPO_SURFACE" "dev:expo"
   cmux send --surface "$EXPO_SURFACE" "cd $WORKTREE_PATH && pnpm dev:expo"$'\n'
   ```

4. **Report immediately** — do NOT wait or verify. Just tell the user:
   - Launched dev:no-expo and dev:expo in separate cmux tabs
   - Next.js will be on port [PORT from step 2, or 3000 if not set]
   - Switch cmux tabs to see each server's logs
