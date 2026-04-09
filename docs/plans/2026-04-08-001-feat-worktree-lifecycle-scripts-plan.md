---
title: "feat: Add worktree lifecycle scripts for isolated parallel development"
type: feat
status: completed
date: 2026-04-08
origin: docs/brainstorms/2026-04-08-worktree-scripts-requirements.md
deepened: 2026-04-08
---

# feat: Add worktree lifecycle scripts for isolated parallel development

## Overview

Add three bash scripts (`bin/worktree-up`, `bin/worktree-down`, `bin/worktree-list`) that create, destroy, and list fully isolated parallel dev environments. Each worktree gets its own Convex deployment, unique Next.js and Expo ports, and clean teardown. Adapted from the proven reference implementation at `~/ez-pilot-app/bin/`.

## Problem Frame

Developers and AI agents working on soonlist-turbo create worktrees ad-hoc without isolated Convex deployments, port management, or cleanup -- leading to port collisions, shared mutable backend state, and orphaned resources. 24 worktrees already exist across `.claude/worktrees/` and `.cursor/worktrees/`. (See origin: `docs/brainstorms/2026-04-08-worktree-scripts-requirements.md`)

## Requirements Trace

- R1-R3: Git worktree creation, pnpm install, env file copying
- R4-R5: Convex deployment creation, deploy key pinning, dual .env.local management
- R6-R8: Port auto-assignment (Next.js 3400+, Expo 8181+) with explicit overrides
- R9-R11: Convex env var copying, schema push, data snapshot
- R12: Summary output with dev server commands
- R13-R16: Process killing, deployment deletion, worktree removal, teardown summary
- R17-R18: Worktree listing with formatted table
- R19-R21: Cross-cutting (pnpm, packages/backend/ CWD, bash conventions)

## Scope Boundaries

- No automatic dev server startup -- scripts print commands only
- No Vercel preview deployment integration
- No CI/CD integration -- local development scripts only
- No worktree "refresh" or "sync" command
- No iOS simulator instance management -- only Expo port isolation
- Production safeguard: scripts must never touch the production Convex deployment

## Context & Research

### Relevant Code and Patterns

- **Reference implementation**: `~/ez-pilot-app/bin/worktree-up` (249 lines), `~/ez-pilot-app/bin/worktree-down` (152 lines) -- proven patterns for all steps
- **Existing `bin/` scripts**: `bin/get-pr-comments`, `bin/resolve-pr-thread` -- use `#!/usr/bin/env bash`, `set -euo pipefail`, positional arg validation
- **Dual `.env.local` architecture**:
  - Root `.env.local`: ~50 vars including `CONVEX_DEPLOYMENT`, `CONVEX_URL`, `NEXT_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_URL` plus all Clerk/Stripe/Sentry/etc keys
  - `packages/backend/.env.local`: Only `CONVEX_DEPLOYMENT` (with trailing `# team: ...` comment) and `CONVEX_URL`
- **`with-env` pattern**: Both `apps/web` and `apps/expo` use `"with-env": "dotenv -e ../../.env.local --"` to load root env vars
- **Convex CLI invocation**: `packages/backend/package.json` has `"dev": "convex dev"` -- CLI runs from that directory and reads its own `.env.local`
- **Env validation**: `apps/web/env.ts` validates `NEXT_PUBLIC_CONVEX_URL` via Zod; `apps/expo/src/utils/config.ts` reads `EXPO_PUBLIC_CONVEX_URL` directly

### Institutional Learnings

- Never deploy to production without explicit user approval -- worktree teardown must safeguard against deleting the production deployment

## Key Technical Decisions

- **Convex CLI upgrade required**: Bump from 1.31.2 to latest in `pnpm-workspace.yaml` catalog. `deployment create` subcommand does not exist in 1.31.2 (see origin)
- **Dual .env.local management**: `deployment create --select` writes to `packages/backend/.env.local` (its CWD). Script then extracts new values and propagates to root `.env.local` using sed-delete-then-append (same as reference)
- **Auth token**: Use `CONVEX_TEAM_ACCESS_TOKEN` from root `.env.local` for Convex API calls (deploy key creation, deployment deletion). Warn and skip gracefully if missing
- **Data export/import**: `cd` between main and worktree `packages/backend/` dirs. Each dir's `.env.local` targets the right deployment automatically
- **Port ranges**: Next.js 3400+, Expo 8181+ -- avoids defaults (3000, 8081) and EasyPilot's range (3200+) for same-machine multi-project dev
- **Convex vars to rewrite**: Root: `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_URL`, `CONVEX_URL`. Backend: `CONVEX_DEPLOYMENT`, `CONVEX_URL`
- **Sed pattern for backend .env.local**: Must handle trailing `# team: ...` comment that Convex CLI appends to `CONVEX_DEPLOYMENT`
- **Quote handling**: Root `.env.local` uses double-quoted values (e.g., `CONVEX_DEPLOYMENT="dev:lovable-camel-478"`). All extraction logic must strip double quotes before using values. When writing back to root, match the unquoted format used by the reference pattern (dotenv-cli handles both). Backend `.env.local` uses unquoted values with trailing comments -- different extraction logic needed
- **Backend .env.local seeding**: `packages/backend/.env.local` is gitignored and won't exist in a fresh worktree. Must copy it from the main repo's `packages/backend/.env.local` before running `convex deployment create --select`, so the CLI has project context
- **Port scan scope**: Scan all git worktrees (via `git worktree list --porcelain`) for port assignments, not just `.claude/worktrees/` -- matches reference implementation and catches ports from Cursor worktrees too
- **Convex URL propagation**: `deployment create --select` writes `CONVEX_DEPLOYMENT` and `CONVEX_URL` to `packages/backend/.env.local`. The `CONVEX_URL` value is then used to set all three URL vars in root `.env.local` (`NEXT_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_URL`, `CONVEX_URL`) -- do not try to extract `NEXT_PUBLIC_*` from backend's `.env.local`
- **Slug definition**: "Slug" means the deployment identifier used in API URLs (e.g., `lovable-camel-478`). Extracted from `CONVEX_DEPLOYMENT` by stripping the `dev:` prefix and any trailing `# team: ...` comments

## Open Questions

### Resolved During Planning

- **Where does `deployment create --select` write?** To `packages/backend/.env.local` (its CWD). Script extracts new values from there, then propagates to root.
- **Auth token source?** `CONVEX_TEAM_ACCESS_TOKEN` in root `.env.local`, same as reference. Must be provisioned by developer.
- **Data export/import approach?** `cd` between main/worktree `packages/backend/` directories, same pattern as reference.
- **How to invoke Convex CLI from packages/backend/?** `cd "$WT_PATH/packages/backend" && npx convex <command>`. Using `npx` since it resolves the workspace dependency.

### Deferred to Implementation

- Exact latest Convex CLI version number (use `npm view convex version` at implementation time)
- Whether `CONVEX_DEPLOY_KEY` should also be written to `packages/backend/.env.local` or only root (test during implementation)
- Whether `convex export`/`convex import` accept `--path` flag in the upgraded version (verify at implementation time)

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```text
worktree-up <name> [--port P] [--expo-port E] [--no-data]
│
├─ 1. Resolve REPO_ROOT and MAIN_ENV (git worktree list --porcelain fallback)
├─ 2. Validate: name required, path doesn't exist, MAIN_ENV exists
├─ 3. Auto-assign ports: scan ALL git worktrees' .env.local for PORT= and EXPO_PORT=
│     Next.js: max(existing, 3399) + 1    Expo: max(existing, 8180) + 1
├─ 4. git worktree add "$WT_PATH" -b "$NAME"
├─ 5. pnpm install --ignore-scripts (from $WT_PATH)
├─ 6. cp "$MAIN_ENV" "$WT_PATH/.env.local"
│     cp main repo's packages/backend/.env.local -> "$WT_PATH/packages/backend/.env.local"
│     (seeds Convex CLI with project context -- file is gitignored, won't exist otherwise)
├─ 7. cd "$WT_PATH/packages/backend"
│     npx convex deployment create "dev/wt-$NAME" --type dev --select
│     (writes new CONVEX_DEPLOYMENT + CONVEX_URL to packages/backend/.env.local)
├─ 8. Extract CONVEX_URL from packages/backend/.env.local (strip quotes/comments)
│     Propagate to root .env.local: sed-delete + append for all 4 Convex vars
│     Use extracted URL for NEXT_PUBLIC_CONVEX_URL, EXPO_PUBLIC_CONVEX_URL, CONVEX_URL
├─ 9. Deploy key: POST /v1/deployments/{slug}/create_deploy_key
│     Save CONVEX_DEPLOY_KEY to root .env.local
├─10. Write PORT and EXPO_PORT to root .env.local
├─11. Copy Convex env vars: npx convex env list (main) -> npx convex env set (worktree)
├─12. Push schema: cd packages/backend && npx convex dev --once
├─13. Data snapshot (unless --no-data):
│     Export from main packages/backend/ -> /tmp/convex-snapshot-$NAME.zip
│     Import into worktree packages/backend/ with --replace-all -y
└─14. Print summary

worktree-down <name> [--keep-deployment]
│
├─ 1. Validate: name required, WT_PATH exists
├─ 2. Kill processes: lsof -ti :$PORT, lsof -ti :$EXPO_PORT, lsof +D for node/convex
├─ 3. Delete Convex deployment (unless --keep-deployment):
│     Extract slug, POST /v1/deployments/{slug}/delete
│     Production safeguard: refuse if deployment name doesn't start with "dev:"
├─ 4. git worktree remove --force, git branch -D
└─ 5. Print summary

worktree-list
│
├─ Scan .claude/worktrees/*/​.env.local
├─ Extract: NAME, PORT, EXPO_PORT, CONVEX_DEPLOYMENT
└─ Print formatted table with column headers
```

## Implementation Units

- [ ] **Unit 1: Bump Convex CLI version**

**Goal:** Upgrade Convex CLI to latest (>= 1.34.0) so `deployment create` subcommand is available.

**Requirements:** R4 prerequisite

**Dependencies:** None

**Files:**
- Modify: `pnpm-workspace.yaml` (catalog pin for `convex`)

**Approach:**
- Run `npm view convex version` to get latest version
- Update the `convex:` line in the `catalog:` section of `pnpm-workspace.yaml`
- Run `pnpm install` to update lockfile
- Verify `npx convex deployment --help` works from `packages/backend/`

**Patterns to follow:**
- Existing catalog version pin format in `pnpm-workspace.yaml`

**Test expectation:** none -- pure dependency version bump. Verified by checking `npx convex deployment --help` output.

**Verification:**
- From `packages/backend/`: `npx convex deployment --help` shows the `create` subcommand

---

- [ ] **Unit 2: bin/worktree-up**

**Goal:** Create the main worktree setup script that produces a fully isolated dev environment.

**Requirements:** R1, R2, R3, R4, R4a, R5, R6, R7, R8, R9, R10, R11, R12, R19, R20, R21

**Dependencies:** Unit 1 (Convex CLI upgrade)

**Files:**
- Create: `bin/worktree-up`

**Approach:**

The script follows the reference implementation's structure with these soonlist-specific adaptations:

1. **Repo root and main env resolution** -- same pattern as reference (`git worktree list --porcelain` fallback)
2. **Arg parsing** -- add `--expo-port PORT` and `--no-data` flags beyond reference's `--port PORT`
3. **Dual port auto-assignment** -- scan all git worktrees (via `git worktree list --porcelain`, same as reference) for both `PORT=` (starting 3400) and `EXPO_PORT=` (starting 8181). Use the reference's scan-and-increment loop, duplicated for each port var
4. **Git worktree + pnpm install** -- `git worktree add "$WT_PATH" -b "$NAME"` then `cd "$WT_PATH" && pnpm install --ignore-scripts`
5. **Env file seeding** -- copy root `.env.local` to worktree root AND copy main repo's `packages/backend/.env.local` to worktree's `packages/backend/.env.local` (gitignored file, won't exist in fresh worktree -- needed so Convex CLI has project context)
6. **Convex deployment creation** -- `cd "$WT_PATH/packages/backend" && npx convex deployment create "dev/wt-$NAME" --type dev --select`. This writes new `CONVEX_DEPLOYMENT` and `CONVEX_URL` to `packages/backend/.env.local`. Extract values from last occurrence in that file, stripping any double quotes and trailing `# team: ...` comments
7. **Propagate Convex vars to root .env.local** -- sed-delete then append for `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_URL`, `CONVEX_URL`. All three URL vars get the same value (the `CONVEX_URL` extracted from backend's `.env.local`). Strip double quotes from existing root values before comparing/replacing
8. **Deploy key creation** -- same Convex API call as reference; save `CONVEX_DEPLOY_KEY` to root `.env.local`
9. **Port vars** -- sed-delete then append `PORT=$PORT` and `EXPO_PORT=$EXPO_PORT` to root `.env.local`
10. **Convex env vars** -- copy from main deployment to worktree deployment (cd between `packages/backend/` dirs)
11. **Schema push** -- `cd "$WT_PATH/packages/backend" && npx convex dev --once`
12. **Data snapshot** -- unless `--no-data`: export from main `packages/backend/`, import into worktree `packages/backend/` with `--replace-all -y`
13. **Summary** -- print path, branch, ports, Convex deployment, and exact dev server commands:
    - `cd $WT_PATH && pnpm dev:backend` (Convex)
    - `cd $WT_PATH/apps/web && pnpm with-env next dev --turbopack --port $PORT` (Next.js)
    - `cd $WT_PATH/apps/expo && pnpm with-env expo start --port $EXPO_PORT` (Expo)
    - `bin/worktree-down $NAME` (teardown)

**Production safeguard (worktree-down only):** The `dev:` prefix check applies to deployment deletion in worktree-down, not to worktree-up creation.

**Patterns to follow:**
- Reference `~/ez-pilot-app/bin/worktree-up` for overall structure, error handling, and messaging
- Existing `bin/` scripts for shebang and `set -euo pipefail`
- Sed-delete-then-append pattern from reference lines 111-117 for env var deduplication

**Test scenarios:**
- Happy path: `bin/worktree-up test-feature` creates worktree, installs deps, creates Convex deployment, assigns ports 3400/8181 (first worktree), prints summary
- Happy path: Second worktree `bin/worktree-up test-feature-2` assigns ports 3401/8182
- Edge case: Running from inside an existing worktree still finds main repo's `.env.local` via `git worktree list --porcelain`
- Edge case: `--port 3500 --expo-port 8200` overrides auto-assignment
- Edge case: `--no-data` skips the data export/import step
- Error path: Worktree name already exists -- exits with clear error
- Error path: Main `.env.local` missing -- exits with clear error
- Error path: `CONVEX_TEAM_ACCESS_TOKEN` missing -- warns but continues (deploy key skipped)
- Integration: After setup, `cd $WT_PATH/packages/backend && npx convex env list` shows copied env vars
- Integration: Root `.env.local` contains all 4 rewritten Convex vars pointing to new deployment
- Integration: `packages/backend/.env.local` contains new `CONVEX_DEPLOYMENT` and `CONVEX_URL`
- Edge case: Root `.env.local` contains double-quoted values (e.g., `CONVEX_DEPLOYMENT="dev:slug"`) -- extraction strips quotes correctly
- Edge case: `packages/backend/.env.local` does not exist in fresh worktree -- script copies it from main repo before running Convex CLI
- Edge case: Partial setup failure (e.g., schema push fails) -- worktree-down can still clean up the partial worktree

**Verification:**
- Running the script produces a working worktree where `npx convex dev --once` succeeds from `packages/backend/`
- Root `.env.local` has correct `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_URL`, `CONVEX_URL`
- `packages/backend/.env.local` has correct `CONVEX_DEPLOYMENT` and `CONVEX_URL`
- Ports are unique and do not conflict with other worktrees or defaults (3000, 8081) or EasyPilot (3200+)

---

- [ ] **Unit 3: bin/worktree-down**

**Goal:** Create the teardown script that cleanly destroys a worktree and its associated resources.

**Requirements:** R13, R14, R15, R16, R19, R20, R21

**Dependencies:** Unit 2 (worktree-up creates the environments this tears down)

**Files:**
- Create: `bin/worktree-down`

**Approach:**

Follow the reference `~/ez-pilot-app/bin/worktree-down` structure with these adaptations:

1. **Arg parsing** -- name required, `--keep-deployment` flag, `--help` flag
2. **Process killing** -- kill by Next.js port (`lsof -ti :$PORT`), by Expo port (`lsof -ti :$EXPO_PORT`), then by CWD (`lsof +D "$WT_PATH"` filtering for node/convex/next/expo processes). Read both `PORT` and `EXPO_PORT` from worktree's `.env.local`
3. **Convex deployment deletion** (unless `--keep-deployment`):
   - Extract `CONVEX_DEPLOYMENT` from worktree's root `.env.local`, stripping double quotes and trailing `# team: ...` comments
   - **Production safeguard**: Refuse to delete if deployment name does not start with `dev:` -- print error and exit
   - Extract slug: the part after `dev:` prefix (e.g., `dev:wt-foo-123` -> `wt-foo-123`). This is the deployment identifier used in API URLs
   - Source `CONVEX_TEAM_ACCESS_TOKEN` from worktree's `.env.local` (copied from root during setup)
   - `POST /v1/deployments/{slug}/delete` with bearer token
   - Handle success (200), failure (non-200), and missing token cases
4. **Git cleanup** -- `git worktree remove "$WT_PATH" --force` then `git branch -D "$BRANCH"`
5. **Summary** -- report what was cleaned up: worktree removed, branch deleted, deployment deleted/kept/needs-manual-deletion

**Patterns to follow:**
- Reference `~/ez-pilot-app/bin/worktree-down` for process killing logic, API call pattern, and summary format
- Existing `bin/` scripts for conventions

**Test scenarios:**
- Happy path: `bin/worktree-down test-feature` kills processes, deletes deployment, removes worktree, deletes branch
- Happy path: `--keep-deployment` skips Convex deletion, reports "KEPT"
- Edge case: No dev processes running -- "No dev processes found" message, continues
- Edge case: Worktree `.env.local` has no `CONVEX_DEPLOYMENT` -- skips deletion with warning
- Error path: Worktree name doesn't exist -- exits with "worktree not found" error
- Error path: `CONVEX_TEAM_ACCESS_TOKEN` missing -- warns, reports "NEEDS MANUAL DELETION"
- Error path: Convex API returns non-200 -- warns with HTTP status, reports "NEEDS MANUAL DELETION"
- Security: Deployment name not starting with `dev:` -- refuses to delete, exits with error
- Edge case: `CONVEX_DEPLOYMENT` value has double quotes and trailing comment -- extraction handles both correctly
- Edge case: Partial worktree (no .env.local) -- exits with clear error about missing env file

**Verification:**
- After running, the worktree directory no longer exists
- The git branch no longer exists (`git branch --list $NAME` returns empty)
- No processes remain on the worktree's assigned ports
- The Convex deployment is deleted (verify via Convex dashboard or API)

---

- [ ] **Unit 4: bin/worktree-list**

**Goal:** Create a listing script that shows all active worktrees with their port assignments and Convex deployments.

**Requirements:** R17, R18, R19, R21

**Dependencies:** Unit 2 (worktree-up creates the environments this lists)

**Files:**
- Create: `bin/worktree-list`

**Approach:**

1. Scan `REPO_ROOT/.claude/worktrees/*/` directories
2. For each directory that has a `.env.local`, extract:
   - Name (directory basename)
   - Current git branch (`git -C "$dir" branch --show-current`)
   - `PORT` value
   - `EXPO_PORT` value
   - `CONVEX_DEPLOYMENT` value (strip trailing comments)
3. Print a formatted table with column headers using `printf` for alignment
4. If no worktrees found, print "No worktrees found"

**Patterns to follow:**
- Simple directory scan pattern (avoid parsing `git worktree list --porcelain` since `.claude/worktrees/` is a known, stable location)

**Test scenarios:**
- Happy path: Two worktrees exist -- table shows both with correct ports and deployments
- Edge case: No worktrees exist -- prints "No worktrees found"
- Edge case: Worktree directory exists but `.env.local` is missing -- skips or shows "N/A" for missing values
- Edge case: `.env.local` exists but missing `PORT` or `EXPO_PORT` keys -- shows "N/A" for those columns

**Verification:**
- After creating two worktrees with worktree-up, worktree-list shows both with correct data
- After tearing down one with worktree-down, worktree-list shows only the remaining one

## System-Wide Impact

- **Interaction graph:** Scripts interact with Convex API (deployment creation/deletion, deploy key), git (worktree management), and the filesystem (.env.local files). No callback or middleware concerns.
- **Error propagation:** Each step has explicit error handling with warnings for non-critical failures (missing token, API errors) and hard exits for critical failures (missing env file, existing worktree name). Script uses `set -euo pipefail` for fail-fast on unexpected errors.
- **State lifecycle risks:** Partial setup (e.g., Convex deployment created but script fails at schema push) leaves orphaned resources. Mitigation: worktree-down can clean up partial setups. The deploy key pins the CLI to the correct deployment, preventing accidental cross-deployment operations.
- **API surface parity:** These scripts complement but do not replace the existing `.cursor/worktrees.json` which only runs `npm install`. The new scripts are a superset. No existing tooling is broken.
- **Unchanged invariants:** The main repo's `.env.local`, `packages/backend/.env.local`, and all production/preview deployments are never modified by these scripts. Only worktree-local copies are changed.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Convex CLI upgrade may introduce breaking changes | Pin to specific version, test `convex dev --once` from packages/backend/ before proceeding |
| `deployment create --select` may write unexpected vars | Extract values from last occurrence in file (reference pattern handles this) |
| `CONVEX_TEAM_ACCESS_TOKEN` not provisioned | Scripts warn and skip deploy key/deletion gracefully; include setup instructions in summary |
| Data snapshot may be slow for large deployments | `--no-data` flag available; summary notes estimated time if large |
| Production deployment accidentally targeted | Explicit `dev:` prefix check before any deletion; refuse and exit if non-dev deployment detected |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-08-worktree-scripts-requirements.md](docs/brainstorms/2026-04-08-worktree-scripts-requirements.md)
- Reference implementation: `~/ez-pilot-app/bin/worktree-up`, `~/ez-pilot-app/bin/worktree-down`
- Convex API: OpenAPI spec for deployment management endpoints
- Related code: `packages/backend/package.json` (Convex CLI scripts), `apps/web/package.json` and `apps/expo/package.json` (`with-env` pattern)
