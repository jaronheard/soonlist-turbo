---
allowed-tools: Bash, Read
description: Start dev servers (Expo + everything else) in separate cmux tabs
---

# Start Development Servers

Start both development server groups in separate cmux terminal tabs so they run independently of Claude and don't get killed by background task timeouts.

## Instructions

1. **Install dependencies** (fast if already up-to-date):

   ```bash
   pnpm install
   ```

2. **Read the PORT from .env.local** (if it exists):

   ```bash
   grep '^PORT=' .env.local 2>/dev/null | cut -d= -f2-
   ```

   If no PORT is set, default is 3000.

3. **Get the repo root** (not CWD, which may be a subdirectory):

   ```bash
   WORKTREE_PATH=$(git rev-parse --show-toplevel)
   ```

4. **Create two terminal tabs and start each server group**:

   ```bash
   # Non-Expo tab (Next.js web app + Convex backend + other packages)
   NO_EXPO_SURFACE=$(cmux new-surface --type terminal 2>&1 | awk '{print $2}')
   cmux rename-tab --surface "$NO_EXPO_SURFACE" "dev:no-expo"
   cmux send --surface "$NO_EXPO_SURFACE" "cd $WORKTREE_PATH && PORT=$PORT pnpm dev:no-expo"$'\n'

   # Expo tab (mobile app)
   EXPO_SURFACE=$(cmux new-surface --type terminal 2>&1 | awk '{print $2}')
   cmux rename-tab --surface "$EXPO_SURFACE" "dev:expo"
   cmux send --surface "$EXPO_SURFACE" "cd $WORKTREE_PATH && pnpm dev:expo"$'\n'
   ```

5. **Report immediately** — do NOT wait or verify. Just tell the user:
   - Launched dev:no-expo and dev:expo in separate cmux tabs
   - Next.js web app will be on port ${PORT}
   - Switch cmux tabs to see each server's logs
