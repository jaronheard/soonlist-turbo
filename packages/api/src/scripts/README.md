# PostHog Maintenance Scripts

This folder contains utility scripts that help keep PostHog persons aligned with
how identities flow through Soonlist.

## RevenueCat → PostHog Alias Backfill

`backfillRevenueCatAliasesToPosthog.ts` merges historical RevenueCat anonymous
customers (e.g. `$RCAnonymousID:*`) into the matching PostHog person so that
subscription events forwarded from RevenueCat land on the same user profile.

### Environment Variables

- `POSTHOG_PERSONAL_API_KEY` – PostHog personal API key with access to the
  project you want to backfill.
- `POSTHOG_HOST` – Optional; defaults to `https://us.i.posthog.com`.
- `REVENUECAT_API_KEY` – RevenueCat Admin API key (Project settings → API keys).
- `REVENUECAT_HOST` – Optional; defaults to `https://api.revenuecat.com`.
- `CONVEX_URL` – Convex deployment URL used to fetch the user list.
- `CONVEX_URL_PATH` – Optional; defaults to `/posthog/backfill` (same endpoint
  used by the original PostHog backfill).
- `POSTHOG_BACKFILL_TOKEN` – Optional bearer token expected by the Convex
  backfill endpoint.

### Usage

```bash
# Preview without performing merges
POSTHOG_PERSONAL_API_KEY=ph_key \
REVENUECAT_API_KEY=rc_key \
CONVEX_URL=https://<convex> \
node packages/api/src/scripts/backfillRevenueCatAliasesToPosthog.ts --dry-run

# Merge a single user (helpful for validation)
POSTHOG_PERSONAL_API_KEY=ph_key \
REVENUECAT_API_KEY=rc_key \
CONVEX_URL=https://<convex> \
node packages/api/src/scripts/backfillRevenueCatAliasesToPosthog.ts --user user_123
```

The script fetches users from Convex, pulls each corresponding RevenueCat
subscriber, and merges any `$RCAnonymousID:*` aliases into the resolved
PostHog distinct ID. Anonymous IDs without a matching PostHog person are
skipped.

### Recommended Verification

1. Run the script with `--dry-run` and inspect the output for a few known users.
2. When confident, rerun without `--dry-run` (optionally using `--user` for a
   smaller batch first).
3. Spot-check the affected users in the PostHog UI to confirm the anonymous and
   identified persons are merged.

## Forward Fix (Expo App)

The Expo app now keeps RevenueCat in sync with PostHog by updating the
`$posthogUserId` customer attribute:

- After RevenueCat initialisation we set `$posthogUserId` to the current
  (anonymous) PostHog distinct ID so anonymous paywall events align with
  PostHog.
- After `Purchases.logIn(userId)` we immediately write `$posthogUserId`
  with the Clerk/Convex user ID.
- After `Purchases.logOut()` we set `$posthogUserId` back to the fresh
  anonymous PostHog distinct ID.

### Forward-Fix Smoke Test

1. Install the Expo app fresh, trigger a paywall event before signing in, and
   confirm PostHog receives it under the anonymous distinct ID.
2. Sign in, make a RevenueCat purchase (or simulator event), and confirm the
   new events appear on the same PostHog person as the signed-in user.
