---
allowed-tools: Bash, Read
description: Start Expo and web+backend dev servers in separate cmux tabs
---

# Start Development Servers

Start dev servers in separate cmux terminal tabs so they run independently of Claude and don't get killed by background task timeouts.

## Instructions

1. **Install dependencies** (fast if already up-to-date):

   ```bash
   pnpm install
   ```

2. **Read the PORT from .env.local**:

   ```bash
   grep '^PORT=' .env.local | cut -d= -f2-
   ```

   If no PORT is set, default is 3000. Next.js picks up PORT automatically via the `with-env` dotenv loader.

3. **Get the repo root** (not CWD, which may be a subdirectory):

   ```bash
   WORKTREE_PATH=$(git rev-parse --show-toplevel)
   ```

4. **Create two terminal tabs and start each server**:

   ```bash
   # Expo tab (mobile dev server)
   EXPO_SURFACE=$(cmux new-surface --type terminal 2>&1 | awk '{print $2}')
   cmux rename-tab --surface "$EXPO_SURFACE" "expo"
   cmux send --surface "$EXPO_SURFACE" "cd $WORKTREE_PATH && pnpm dev:expo"$'\n'

   # Web + Backend tab (Next.js + Convex + validators + cal)
   WEB_SURFACE=$(cmux new-surface --type terminal 2>&1 | awk '{print $2}')
   cmux rename-tab --surface "$WEB_SURFACE" "web+backend"
   cmux send --surface "$WEB_SURFACE" "cd $WORKTREE_PATH && pnpm dev:no-expo"$'\n'
   ```

5. **Report immediately** — do NOT wait or verify. Just tell the user:
   - Launched Expo and Web+Backend in separate cmux tabs
   - Next.js will be on port ${PORT}
   - Expo dev server on its default port (8081)
   - `pnpm dev:no-expo` runs Next.js, Convex, validators, and cal in parallel
   - Switch cmux tabs to see each server's logs
