# PlanetScale to Convex Sync

## Overview

This sync runs every 5 minutes to copy new and updated events and event follows from PlanetScale to Convex.

## Testing

### Manual Sync

To manually trigger a sync, you can use the HTTP endpoint:

```bash
# Without authentication
curl -X POST https://your-convex-deployment.convex.site/sync/planetscale

# With authentication (if SYNC_AUTH_TOKEN is set)
curl -X POST https://your-convex-deployment.convex.site/sync/planetscale \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Sync Status

To check the last sync times:

```bash
curl https://your-convex-deployment.convex.site/sync/health
```

## What Gets Synced

1. **Events**: New events (created_at > last sync) and updated events (updatedAt > last sync)
   - Uses timestamp-based incremental sync
2. **Event Follows**: All event follows using offset-based pagination
   - Since EventFollows table lacks timestamps, uses offset tracking
   - Processes in batches of 1000 records
   - Only syncs follows where both user and event exist in Convex
3. **Users**: Fetched from PlanetScale when needed (no placeholder emails)

## Monitoring

- Check Convex logs for sync results
- The sync state is stored in the `syncState` table
- Each sync type tracks its own last sync time

## Environment Variables

- `DATABASE_URL`: PlanetScale connection string (required)
- `SYNC_AUTH_TOKEN`: Optional token for HTTP endpoint authentication
