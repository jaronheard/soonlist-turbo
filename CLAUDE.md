# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Soonlist is an iOS app with a corresponding Next.js web app that lets users save events by parsing them with AI and have all their possibilities in one place.

Key features:
- Screenshot any event and add it instantly - no typing required
- AI automatically extracts event details from screenshots, URLs, text, or photos
- Keep all your event possibilities organized in one place
- Share events with anyone

It's built as a Turborepo monorepo with an Expo mobile app and Next.js web app, both sharing a Convex backend (migrating from tRPC).

## Your Role

Your role is to write code. You do NOT have access to the running iOS app or web app, so you cannot test the code. You MUST rely on me, the user, to test the code.

If I report a bug in your code, after you fix it, you should pause and ask me to verify that the bug is fixed.

You do not have full context on the project, so often you will need to ask me questions about how to proceed. Don't be shy to ask questions -- I'm here to help you!

If I send you a URL, you should consider fetching its contents if your environment permits and it appears safe to do so. Exercise caution with URL fetching - verify the source is trusted and defer to the user's discretion when security or feasibility concerns arise.

## Workflow

### Git Workflow

1. **Always create a new branch** - Never commit to main
   - Name branches descriptively based on the feature (e.g., `add-event-sharing`, `fix-screenshot-parsing`)
   - Checkout main and pull latest changes before creating a new branch

2. **Commit often** as you work
   - Use clear commit messages that describe what changed
   - Before committing, ALWAYS run:
     ```bash
     pnpm lint:fix
     pnpm format:fix
     pnpm typecheck
     ```

3. **Create a PR when ready**
   - Use `@coderabbit` as the PR title
   - Push the branch to GitHub
   - Create the PR using `gh pr create`

### Important Git Rules
- NEVER commit to main
- NEVER push to origin/main
- Always ensure lint, format, and typecheck pass before committing

## Essential Development Commands

### Starting Development
```bash
pnpm dev                 # Run all services (web, mobile, backend)
pnpm dev:backend        # Run Convex backend only
pnpm dev:expo           # Run Expo mobile app only
pnpm dev:no-expo        # Run web and backend only
```

### Code Quality - Run Before Committing
```bash
pnpm lint:fix           # Fix linting issues
pnpm format:fix         # Fix formatting
pnpm typecheck          # Check TypeScript types
```

### Database Operations
```bash
pnpm db:push            # Push database schema changes
```

### Mobile Development Setup
```bash
pnpm ngrok-YOURNAME     # Start ngrok tunnel (replace YOURNAME)
```

### Building
```bash
pnpm build              # Build all packages
pnpm expo:build:ios     # Build iOS app with EAS
pnpm expo:build:android # Build Android app with EAS
```

## Architecture Overview

### Monorepo Structure
- **apps/expo**: React Native mobile app using Expo Router, NativeWind, and React Query
- **apps/web**: Next.js 15 app with App Router, React 19, and TailwindCSS
- **packages/backend**: Convex backend with real-time sync and workflows
- **packages/api**: Legacy tRPC API (being migrated to Convex)
- **packages/db**: Drizzle ORM schemas for MySQL/PlanetScale
- **packages/ui**: Shared React components using Shadcn/Radix UI
- **packages/validators**: Zod validation schemas

### Key Technology Decisions
- **Backend**: Always use Convex for new features (do not modify tRPC code)
- **Authentication**: Clerk for both web and mobile
- **State Management**: Convex for server state, Zustand for client state (mobile)
- **Styling**: TailwindCSS (web) and NativeWind (mobile)
- **Icons**: lucide-react and lucide-react-native
- **AI Integration**: OpenRouter with Gemini for event extraction
- **Payments**: RevenueCat (mobile) - moving away from Stripe

### Convex Guidelines
- All new features must be built in `packages/backend/convex/`
- Follow Convex documentation best practices
- Business logic goes in `convex/model/`, thin API wrappers in `convex/*.ts`
- Use Convex validators (`v.*`) instead of Zod
- Note: Zod remains the default for form validation outside Convex functions; use Convex validators inside Convex functions only
- Use `ConvexError` instead of `TRPCError`
- Pass user IDs as explicit parameters

### Coding Conventions

#### TypeScript
- Strict mode is enabled - follow all strict mode requirements
- Avoid `any` types - figure out the proper types instead
- Type assertions (`as`) are occasionally acceptable, but ensure there's not a better approach first
- Use descriptive variable names with camelCase
- Prefer interfaces over types in TypeScript
- Avoid enums, use literal types instead

#### React Components
- Use functional components only - no class components
- Follow existing patterns in the codebase for:
  - Component naming
  - State management (check existing code)
  - Hook usage
  - Props interfaces

#### General Patterns
- Directory names should be lowercase-dash
- Check existing code for:
  - Async/await patterns
  - Error handling approaches
  - State management patterns
- Always check for existing UI components before creating new ones
- Use Server Components in Next.js where possible

### Environment Setup
The project requires extensive environment variables. Use:
```bash
pnpm env:sync:local     # Pull development env vars from Vercel
pnpm env:sync:production # Pull production env vars
```

Key environment variable groups:
- Clerk authentication
- Convex backend
- Database connections
- AI service APIs (OpenRouter, Gemini)
- Payment providers (RevenueCat)
- Analytics (PostHog, Sentry)
- Push notifications (OneSignal)

### Mobile Development Notes
- Each developer needs a personal ngrok edge (see README.md)
- Use Maestro for E2E testing (`.maestro/` directory)
- Expo Router provides typed navigation
- OneSignal handles push notifications
- Follow NativeWind patterns for styling

### Testing Approach
- No traditional unit testing framework currently
- Maestro for mobile E2E tests: `pnpm test` in apps/expo
- Rely on TypeScript for type safety
- Manual testing with ngrok for webhooks

## Common Development Tasks

### Adding a New Feature
1. Always use Convex for new features (never modify tRPC code)
2. Add to appropriate module in `packages/backend/convex/`
3. Update validators in `packages/validators/` if needed
4. Add UI components to `packages/ui/` for shared use
5. Implement in both web and mobile apps if applicable

### Working with Events
- Main data model revolves around "possibilities" (saved events)
- Events can be captured from screenshots, URLs, text, or photos
- AI extracts event details automatically
- See `packages/backend/convex/MIGRATION_GUIDE.md` for all event endpoints

### Debugging
When debugging issues:
- Check Convex dashboard for backend logs
- Use Sentry for error tracking
- PostHog for analytics and user behavior
- Use Convex and the Convex MCP for database inspection
- If you need specific debugging steps, I'll ask you for guidance