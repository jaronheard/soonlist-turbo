---
name: cmux-start-dev
allowed-tools: Bash, Read
description: Start dev servers in separate cmux tabs (cmux required; otherwise use /start-dev)
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
   WORKTREE_PATH=$(git rev-parse --show-toplevel) && PORT=$(grep '^PORT=' "$WORKTREE_PATH/.env.local" 2>/dev/null | cut -d= -f2-) && printf '%s\n' "${PORT:-3000}"
   ```

   Save the printed value for step 5.

3. **Clean up existing tabs** — close any previously created dev tabs so re-running `/start-dev` is idempotent:

   ```bash
   for EXISTING in $(cmux tree 2>&1 | grep -E '"(dev:no-expo|dev:expo)"' | grep -o 'surface:[0-9]*'); do cmux close-surface --surface "$EXISTING" 2>/dev/null || true; done
   ```

4. **Create two terminal tabs and start each server group** — run this as a **single** Bash command chained with `&&`. Never use `set -e` with newlines (orphan tabs on failure) and never split into parallel Bash calls:

   ```bash
   WORKTREE_PATH=$(git rev-parse --show-toplevel) && PORT=$(grep '^PORT=' "$WORKTREE_PATH/.env.local" 2>/dev/null | cut -d= -f2-) && PORT=${PORT:-3000} && NO_EXPO_COMMAND=$(printf 'cd %q && PORT=%q pnpm dev:no-expo\n' "$WORKTREE_PATH" "$PORT") && NO_EXPO_SURFACE=$(cmux new-surface --type terminal 2>&1 | awk '{print $2}') && cmux rename-tab --surface "$NO_EXPO_SURFACE" "dev:no-expo" && cmux send --surface "$NO_EXPO_SURFACE" "$NO_EXPO_COMMAND" && EXPO_COMMAND=$(printf 'cd %q && pnpm dev:expo\n' "$WORKTREE_PATH") && EXPO_SURFACE=$(cmux new-surface --type terminal 2>&1 | awk '{print $2}') && cmux rename-tab --surface "$EXPO_SURFACE" "dev:expo" && cmux send --surface "$EXPO_SURFACE" "$EXPO_COMMAND"
   ```

5. **Report immediately** — do NOT wait or verify. Just tell the user:
   - Launched dev:no-expo and dev:expo in separate cmux tabs
   - Next.js will be on port [PORT from step 2, or 3000 if not set]
   - Switch cmux tabs to see each server's logs
