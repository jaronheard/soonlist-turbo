# Aggregate Component Migration

## Overview

This migration introduces the Convex Aggregate component to optimize the `getUserStats` function, which was experiencing 700-1000ms cold start times due to:

1. Fetching ALL user events (~1,000+ events for active users)
2. Fetching ALL eventFollows (~500+ for active users)
3. N+1 query problem - looping through each followed event making individual DB queries

## What Changed

### Performance Improvements

**Before:**

- `getUserStats`: O(n) - Fetched all events and follows, filtered in memory
- Cold start: 700-1000ms for active users
- N+1 queries for followed events

**After:**

- `getUserStats`: O(log(n)) - Uses aggregate counts with bounded queries
- Expected cold start: <100ms
- No N+1 queries - batched event fetching

### New Components

1. **Aggregates Configuration** (`convex/convex.config.ts`):

   - `eventsByCreation`: Aggregates events by userId and creation time
   - `eventsByStartTime`: Aggregates events by userId and start time
   - `eventFollowsAggregate`: Aggregates event follows by userId

2. **Aggregate Definitions** (`convex/aggregates.ts`):

   - TableAggregate instances for efficient stats calculations
   - Namespaced by userId to avoid contention between users

3. **Auto-sync Hooks** (in `convex/model/events.ts`):
   - Event create/update/delete automatically syncs with aggregates
   - Follow/unfollow automatically syncs with aggregates

### Stats Calculation Changes

The `getUserStats` function now uses:

- **capturesThisWeek**: Count events with `created_at` in last 7 days using bounded aggregate query
- **upcomingEvents (own)**: Count events with `startDateTime >= now` using bounded aggregate query
- **allTimeEvents (own)**: Total count from aggregate
- **totalFollows**: Total count from aggregate
- **upcomingFollowedEvents**: Optimized batch fetching (still requires queries but no longer N+1)

## Deployment Steps

### 1. Deploy the Code

```bash
cd packages/backend
pnpm run dev  # or deploy to production
```

### 2. Initialize Aggregates for Existing Data

After deployment, run the migration to populate aggregates with existing data:

```typescript
// In Convex dashboard or using npx convex run
npx convex run migrations/initializeAggregates:initializeAllAggregates
```

This will:

- Process all existing events and add them to the aggregates
- Process all existing event follows and add them to the aggregates
- Print progress logs

### 3. Verify

Check that the aggregates are working:

```typescript
// Test getUserStats
npx convex run events:getStats '{"userName": "test-user"}'
```

The response should be fast (<100ms) even for users with many events.

## Technical Details

### Aggregate Structure

**eventsByCreation:**

- Namespace: `userId` (separate tree per user)
- SortKey: `created_at` timestamp in ms
- Use: Count events in time ranges

**eventsByStartTime:**

- Namespace: `userId` (separate tree per user)
- SortKey: `startDateTime` timestamp in ms
- Use: Count upcoming events

**eventFollowsAggregate:**

- Namespace: `userId` (separate tree per user)
- SortKey: `null` (only need counts)
- Use: Count total follows

### Namespacing Benefits

Using `userId` as namespace:

- Each user's data is in a separate B-tree
- No contention between users
- One user's activity doesn't cause other users' queries to rerun
- Better performance for concurrent updates

### Bounds Queries

Example of counting events from last 7 days:

```typescript
const capturesThisWeek = await eventsByCreation.count(ctx, {
  namespace: userId,
  bounds: {
    lower: { key: sevenDaysAgoMs, inclusive: true },
    upper: { key: nowMs, inclusive: true },
  },
});
```

This only reads O(log(n)) nodes instead of all events.

## Rollback Plan

If issues arise, you can temporarily revert to the old implementation:

1. Revert the changes to `getUserStats` in `convex/model/events.ts`
2. Remove aggregate syncing from create/update/delete functions
3. The old code pattern is preserved in git history

## Monitoring

Watch for:

- Query execution times in Convex dashboard
- Any aggregate sync errors in logs
- User-reported stats discrepancies

## Future Optimizations

The one remaining optimization opportunity is **upcomingFollowedEvents**, which still requires fetching follows. Potential improvements:

1. **Denormalized Aggregate**: Store followed events with their start times in a separate aggregate
2. **Event-based Updates**: When event times change, update all follower aggregates
3. **Trade-off**: More complex sync logic but O(log(n)) for all stats

## Questions?

Contact the backend team or check:

- Convex Aggregate docs: https://www.convex.dev/components/aggregate
- This migration guide
