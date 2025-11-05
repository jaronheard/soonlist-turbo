# PostHog Integration

This document describes the PostHog integration for user identity tracking and aliasing.

## Overview

PostHog is used for analytics and user behavior tracking. The integration ensures proper user identity tracking across all authentication flows, including aliasing anonymous IDs to identified user IDs when users authenticate.

## PostHog Backfill Script

The PostHog backfill script (`packages/api/src/scripts/backfillPosthogAliases.ts`) merges anonymous PostHog persons into identified user persons for users who converted from guest to identified without proper aliasing.

### Environment Variables

- `POSTHOG_PERSONAL_API_KEY` - PostHog Personal API Key (required for backfill script)
  - Get this from PostHog Settings > Project API Keys > Personal API Keys
- `POSTHOG_HOST` - PostHog instance host (optional, defaults to `https://us.i.posthog.com`)
- `CONVEX_URL` - Convex deployment URL (required for backfill script)
- `POSTHOG_BACKFILL_TOKEN` - Optional authentication token for the backfill HTTP endpoint

### Usage

```bash
POSTHOG_PERSONAL_API_KEY=your_key CONVEX_URL=your_url node packages/api/src/scripts/backfillPosthogAliases.ts
# Or with dry-run mode:
POSTHOG_PERSONAL_API_KEY=your_key CONVEX_URL=your_url node packages/api/src/scripts/backfillPosthogAliases.ts --dry-run
```

The script will:

1. Fetch all users from Convex
2. For each user, find their identified PostHog person by `distinct_id` (user.id)
3. Search for anonymous persons by email
4. Merge anonymous persons into the identified person

### HTTP Endpoint

The `/posthog/backfill` HTTP endpoint provides paginated access to users for the backfill script. If `POSTHOG_BACKFILL_TOKEN` is set, requests must include `Authorization: Bearer <token>` header.

## Convex Functions

### `posthog.ts`

- `listUsersForBackfill` - Internal action that returns paginated list of users with their IDs, emails, and usernames for the backfill script

### `users.ts`

- `getAllUsersPaginated` - Query that returns all users with pagination (for backfill scripts)

## Identity Tracking

User identity is tracked automatically when users authenticate via:

- Email/password sign-in
- Email sign-up with verification
- OAuth sign-in (Google, Apple)
- OAuth sign-up (Google, Apple)

On authentication, the system:

1. Checks for an existing anonymous PostHog ID
2. If an anonymous ID exists and differs from the authenticated user ID, creates an alias
3. Calls `identify()` with the authenticated user ID and user properties (email, username)

When users sign out, PostHog identity is reset to clear the session.

See the implementation in:

- Web: `apps/web/app/PostHogPageView.tsx`
- Expo: `apps/expo/src/components/PostHogIdentityTracker.tsx` and `apps/expo/src/lib/posthogIdentity.ts`
