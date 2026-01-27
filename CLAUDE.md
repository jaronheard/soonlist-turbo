# CLAUDE.md

Soonlist is a Turborepo monorepo with an Expo iOS app and Next.js web app that lets users save events by parsing them with AI.

## Package Manager

This project uses pnpm workspaces.

## Before Committing

```bash
pnpm lint:fix && pnpm format:fix && pnpm check && git diff --stat
```

## Quick Reference

| Area | Guide |
|------|-------|
| Git workflow | [.cursor/rules/git.mdc](.cursor/rules/git.mdc) |
| TypeScript | [.cursor/rules/typescript.mdc](.cursor/rules/typescript.mdc) |
| React patterns | [.cursor/rules/react.mdc](.cursor/rules/react.mdc) |
| Zustand (mobile) | [.cursor/rules/zustand.mdc](.cursor/rules/zustand.mdc) |
| Convex backend | [packages/backend/.cursor/rules/convex_rules.mdc](packages/backend/.cursor/rules/convex_rules.mdc) |
| Mobile (Expo) | [apps/expo/AGENTS.md](apps/expo/AGENTS.md) |
| Web (Next.js) | [apps/web/AGENTS.md](apps/web/AGENTS.md) |

## Key Decisions

- **Backend**: Use Convex for all new features (tRPC is legacy)
- **Auth**: Clerk
- **Styling**: TailwindCSS (web), NativeWind (mobile)
