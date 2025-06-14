# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Soonlist is an event discovery and organization platform built as a Turborepo monorepo. The project consists of a Next.js web app and Expo mobile app, both sharing a Convex backend (migrating from tRPC).

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
pnpm db:studio          # Open Drizzle Studio UI
```

### Mobile Development Setup
```bash
pnpm ngrok-YOURNAME     # Start ngrok tunnel (replace YOURNAME)
pnpm stripe:webhook     # Forward Stripe webhooks locally
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
- **Backend**: Migrating from tRPC to Convex for better real-time support
- **Authentication**: Clerk for both web and mobile
- **State Management**: Convex for server state, Zustand for client state (mobile)
- **Styling**: TailwindCSS (web) and NativeWind (mobile)
- **Icons**: lucide-react and lucide-react-native
- **AI Integration**: OpenAI, Anthropic, and Groq for event extraction
- **Payments**: Stripe (web) and RevenueCat (mobile)

### Convex Migration Pattern
When working with backend code:
1. New features should be built in `packages/backend/convex/`
2. Follow the pattern: business logic in `convex/model/`, thin API wrappers in `convex/*.ts`
3. Use Convex validators (`v.*`) instead of Zod
4. Use `ConvexError` instead of `TRPCError`
5. Pass user IDs as explicit parameters

### Coding Conventions
- Use functional components and hooks only
- Prefer interfaces over types in TypeScript
- Use descriptive variable names with camelCase
- Directory names should be lowercase-dash
- Avoid enums, use literal types instead
- Use Server Components in Next.js where possible
- Always check for existing UI components before creating new ones

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
- AI service APIs (OpenAI, Anthropic, Groq)
- Payment providers (Stripe, RevenueCat)
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
1. Check if it should use Convex (preferred) or tRPC (legacy)
2. For Convex: Add to appropriate module in `packages/backend/convex/`
3. Update validators in `packages/validators/` if needed
4. Add UI components to `packages/ui/` for shared use
5. Implement in both web and mobile apps if applicable

### Working with Events
- Main data model revolves around "possibilities" (saved events)
- Events can be captured from screenshots, URLs, text, or photos
- AI extracts event details automatically
- See `packages/backend/convex/MIGRATION_GUIDE.md` for all event endpoints

### Debugging
- Check Convex dashboard for backend logs
- Use Sentry for error tracking
- PostHog for analytics and user behavior
- Drizzle Studio for database inspection