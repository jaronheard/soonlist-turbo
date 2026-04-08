---
date: 2026-04-08
topic: worktree-scripts
---

# Worktree Lifecycle Scripts for soonlist-turbo

## Problem Frame

Developers working on soonlist-turbo need isolated parallel environments for feature work, code review, and AI agent sessions. Today, worktrees are created ad-hoc without isolated Convex deployments, port management, or proper cleanup -- leading to port collisions, shared mutable backend state, and orphaned resources.

The goal is three scripts (`bin/worktree-up`, `bin/worktree-down`, `bin/worktree-list`) that give each worktree a fully isolated dev stack: its own Convex deployment, unique Next.js and Expo ports, and clean teardown.

Reference implementation: `~/ez-pilot-app/bin/worktree-up` and `~/ez-pilot-app/bin/worktree-down`.

```
                    bin/worktree-up <name>
                           |
          +----------------+----------------+
          |                |                |
    git worktree     pnpm install     copy .env.local
     add (branch)                     from main repo
          |                                 |
          |                    create Convex dev deployment
          |                    (dev/wt-NAME) + deploy key
          |                                 |
          |                    rewrite Convex vars in
          |                    worktree .env.local
          |                                 |
          +----------------+----------------+
                           |
              auto-assign ports (Next.js 3400+,
              Expo 8181+) scanning existing worktrees
                           |
              copy Convex env vars from main deployment
                           |
              push schema + functions (convex dev --once)
                           |
              snapshot data (export main -> import worktree)
                           |
              print summary: path, branch, ports,
              Convex deployment, dev server commands


                    bin/worktree-down <name>
                           |
          +----------------+----------------+
          |                |                |
    kill dev procs   delete Convex    remove worktree
    (Next.js, Expo,  deployment via   + delete branch
     Convex on       API (curl)
     assigned ports)
          |
    print teardown summary


                    bin/worktree-list
                           |
              scan .claude/worktrees/*/
              read each .env.local for ports + deployment
              show table: name, branch, ports, Convex slug
```

## Requirements

**Worktree Creation (`bin/worktree-up`)**

- R1. Create a git worktree at `REPO_ROOT/.claude/worktrees/NAME` on a new branch `NAME`
- R2. Run `pnpm install` in the worktree (use `--ignore-scripts` to avoid hook failures in worktrees)
- R3. Copy `.env.local` from the main repo root (resolve via `git worktree list --porcelain` if running from a worktree)
- R4. Create a Convex dev deployment named `dev/wt-NAME` using `pnpm convex deployment create` from `packages/backend/`, then rewrite all Convex-related vars in the worktree's root `.env.local`: `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_URL`, and `CONVEX_URL` (sed-delete then append pattern)
- R4a. Update `packages/backend/.env.local` in the worktree (file already exists in this repo) with the new `CONVEX_DEPLOYMENT` and `CONVEX_URL` so the Convex CLI targets the correct deployment when run from that directory
- R5. Create a deploy key for the new deployment via Convex API and save as `CONVEX_DEPLOY_KEY` in `.env.local` -- this pins all Convex CLI commands to the worktree's deployment
- R6. Auto-assign a unique Next.js port (starting at 3400) by scanning existing worktree `.env.local` files; save as `PORT` in `.env.local`
- R7. Auto-assign a unique Expo port (starting at 8181) by scanning existing worktree `.env.local` files; save as `EXPO_PORT` in `.env.local`
- R8. Allow explicit port overrides via `--port PORT` and `--expo-port PORT` flags
- R9. Copy Convex environment variables from the main deployment to the new deployment using `pnpm convex env list` / `pnpm convex env set`
- R10. Push schema and functions to the new deployment with `pnpm convex dev --once` (run from `packages/backend/`)
- R11. Export data from the main Convex deployment and import into the worktree deployment by default; skip with `--no-data` flag
- R12. Print a summary showing: worktree path, branch, Next.js port, Expo port, Convex deployment name, and exact commands to start dev servers

**Worktree Teardown (`bin/worktree-down`)**

- R13. Kill dev processes running from the worktree: processes on the assigned Next.js port, Expo port, and any node/convex processes with CWD inside the worktree
- R14. Delete the Convex deployment via API using auth token (see Dependencies); support `--keep-deployment` flag to skip
- R15. Remove the git worktree (`git worktree remove --force`) and delete the branch (`git branch -D`)
- R16. Print a teardown summary showing what was cleaned up and what needs manual attention

**Worktree Listing (`bin/worktree-list`)**

- R17. Scan `REPO_ROOT/.claude/worktrees/*/` and read each worktree's `.env.local` to extract port assignments and Convex deployment name
- R18. Display a formatted table: name, branch, Next.js port, Expo port, Convex deployment

**Cross-cutting**

- R19. All scripts use `pnpm` (not `bun`) for package management and Convex CLI invocation
- R20. Convex CLI commands must run from `packages/backend/` since that's where `convex/` lives in this monorepo
- R21. All scripts must be `bash` with `set -euo pipefail` and include `--help` usage text

## Success Criteria

- A developer can run `bin/worktree-up feature-x` and get a fully isolated environment with no manual steps
- Two worktrees can run dev servers simultaneously without port collisions (both Next.js and Expo)
- Two worktrees can run separate iOS simulators in parallel (unique Expo ports)
- `bin/worktree-down feature-x` leaves no orphaned processes, branches, or Convex deployments
- `bin/worktree-list` shows all active worktrees with their port assignments at a glance

## Scope Boundaries

- No automatic dev server startup -- scripts set up the environment and print commands
- No Vercel preview deployment integration
- No CI/CD integration -- these are local development scripts only
- No worktree "refresh" or "sync" command (pull latest main into worktree) -- out of scope for v1
- No management of iOS simulator instances themselves -- only Expo port isolation

## Key Decisions

- **Data snapshot on by default**: Matches reference pattern; `--no-data` flag to skip for speed
- **Two port ranges**: Next.js starts at 3400, Expo starts at 8181 -- avoids defaults (3000, 8081) and EasyPilot's range (3200+) for same-machine multi-project development
- **Expo port stored as `EXPO_PORT`**: Expo reads `--port` flag at startup, so the summary prints the right `expo start --port $EXPO_PORT` command
- **Convex CLI runs from `packages/backend/`**: Unlike the reference (root-level Convex), this monorepo has Convex in a sub-package -- all `convex` commands must `cd packages/backend/` first
- **Dual `.env.local` management**: Root `.env.local` has app env vars (read by Next.js/Expo via `dotenv -e ../../.env.local`); `packages/backend/.env.local` has Convex CLI vars. Both must be updated with the worktree's deployment info
- **Convex vars to rewrite**: `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_URL`, and `CONVEX_URL` in root; `CONVEX_DEPLOYMENT` and `CONVEX_URL` in `packages/backend/.env.local`

## Dependencies / Assumptions

- **Convex CLI >= 1.34.0 required**: The current pinned version (1.31.2) does not have the `deployment create` subcommand. The catalog pin in `pnpm-workspace.yaml` must be bumped before these scripts will work.
- **Auth for Convex API**: R5 and R14 use Convex HTTP API endpoints (documented in OpenAPI spec). Requires `CONVEX_TEAM_ACCESS_TOKEN` in `.env.local` (must be provisioned -- same approach as EasyPilot reference). Scripts warn and skip if missing.
- `pnpm convex` works from `packages/backend/` to invoke the workspace's Convex CLI

## Outstanding Questions

### Resolve Before Planning

(None -- all product decisions are resolved)

### Deferred to Planning

- [Affects R4, R20][Technical] `deployment create --select` writes to whichever `.env.local` is in CWD. Since we run from `packages/backend/`, it writes there -- then the script must also propagate the new URL vars to root `.env.local`. Follow the same sed-delete-then-append pattern as the reference.
- [Affects R5, R14][Technical] Use `CONVEX_TEAM_ACCESS_TOKEN` for API auth, same as the reference. Add it to `.env.local` with a setup instruction. Fall back to warning if missing (reference pattern).
- [Affects R11][Technical] For data export/import, `cd` between main and worktree `packages/backend/` dirs -- same pattern as reference. Each dir's `.env.local` targets the right deployment.
- [Affects R4][Prerequisite] Bump Convex CLI to latest (>= 1.34.0) in `pnpm-workspace.yaml` catalog before implementation.

## Next Steps

-> `/ce:plan` for structured implementation planning
