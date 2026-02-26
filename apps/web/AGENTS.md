# Web App

Next.js 15 with App Router, React 19, and TailwindCSS.

## Server Components

Prefer Server Components where possible.

## UI Components

Check `packages/ui/` for shared Shadcn/Radix components before creating new ones.

## Styling

TailwindCSS with the project's design system.

## Environment

```bash
pnpm env:sync:local      # Pull dev env vars from Vercel
pnpm env:sync:production # Pull prod env vars
```
