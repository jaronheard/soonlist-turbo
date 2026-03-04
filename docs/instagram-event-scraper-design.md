# Instagram Event Scraper - Design Document

## Overview

Enable Soonlist users to track Instagram accounts that post events, automatically scraping and ingesting those events into their Soonlist feed.

## Problem

Event organizers, venues, and curators frequently post event information on Instagram. Today, Soonlist users must manually screenshot or copy-paste each post. This feature automates that process: a user adds an Instagram username, and Soonlist periodically checks for new event posts and creates events from them.

## Architecture

### Data Flow

```
User adds @username → instagramSources table
                            ↓
              Cron job (every 4 hours)
                            ↓
              Fetch recent posts (via fetcher)
                            ↓
              AI classification: "Is this an event?"
                            ↓
              [Yes] → Event extraction (existing AI pipeline)
                            ↓
              Dedup check (sourceUrls + similarity grouping)
                            ↓
              Insert event → User's feed
```

### Fetcher Strategy (Pluggable)

The system uses a pluggable fetcher approach to decouple post retrieval from processing. This is critical because Instagram access methods change frequently.

#### Tier 1: Prototype (Current Implementation)

**Apify Instagram Scraper** - Most reliable for public profiles
- Uses Apify's `apify/instagram-profile-scraper` actor
- Returns structured post data (caption, images, timestamps, URLs)
- Rate: ~$0.25-0.50 per 1000 posts
- No Instagram credentials needed for public profiles
- API key stored as Convex environment variable

**Manual URL Input** (Fallback)
- User pastes individual Instagram post URLs
- Processed through existing `eventFromUrlWorkflow`
- Works today, zero additional infrastructure

#### Tier 2: Scale-Ready

**Instagram Graph API with Instagram Login**
- User connects their Instagram account via OAuth
- Access to their own posts and followed accounts' posts
- Official, ToS-compliant at any scale
- Requires Meta App Review for production
- Best for: "Show me events from accounts I follow"

**RSSHub / RSS Bridge**
- Self-hosted RSS proxy that converts Instagram profiles to RSS feeds
- No API keys needed, but requires hosting
- Less reliable (Instagram blocks aggressively)
- Good as a free fallback

#### Tier 3: Full Integration

**Browser Extension**
- User installs extension that reads their Instagram feed
- Sends post content to Soonlist backend
- Most ToS-friendly (user-initiated, user's own data)
- Highest development effort

### Instagram ToS Considerations

| Approach | ToS Risk | Mitigation |
|----------|----------|------------|
| Manual URL paste | None | User-initiated |
| oEmbed API | None | Official API |
| Graph API + OAuth | None | Official API |
| Apify scraper | Low-Medium | Legitimate service, public data, opt-in |
| Direct scraping | High | Avoid in production |
| Browser extension | None | User-initiated, user's data |

**Our approach**: Start with Apify (established service, widely used) for the prototype. The user explicitly opts in to track specific public accounts. We cache aggressively and rate-limit requests. For production scale, migrate to Instagram Graph API with proper OAuth.

### Database Design

#### New Table: `instagramSources`

```typescript
instagramSources: defineTable({
  userId: v.string(),           // Soonlist user who added this source
  username: v.string(),         // Instagram username (without @)
  displayName: v.optional(v.string()), // Instagram display name
  profileUrl: v.string(),       // https://instagram.com/{username}
  lastCheckedAt: v.optional(v.number()), // Timestamp of last check
  lastPostId: v.optional(v.string()),    // ID of most recent post seen
  status: v.union(              // Source status
    v.literal("active"),
    v.literal("paused"),
    v.literal("error"),
  ),
  errorMessage: v.optional(v.string()),
  checkIntervalHours: v.number(),  // How often to check (default: 4)
  postsChecked: v.number(),        // Total posts checked
  eventsFound: v.number(),         // Total events found
  createdAt: v.number(),           // Timestamp
})
  .index("by_user", ["userId"])
  .index("by_username", ["username"])
  .index("by_user_and_username", ["userId", "username"])
  .index("by_status", ["status"])
```

#### Event Metadata Integration

Events created from Instagram scraping use the existing `eventMetadata` field:

```typescript
eventMetadata: {
  platform: "instagram",
  mentions: ["venue_account", "event_organizer"],
  sourceUrls: ["https://instagram.com/p/ABC123"]
}
```

This enables:
- Deduplication: If the same post URL exists in `sourceUrls`, skip it
- Attribution: Shows which Instagram account the event came from
- Linking: Users can tap to view the original Instagram post

### AI Processing Pipeline

Each Instagram post goes through a two-stage AI pipeline:

**Stage 1: Event Classification**
```
"Is this Instagram post about an event? An event has a specific
date/time, location, and is something people can attend.
Return { isEvent: true/false, confidence: 0-1 }"
```

This is cheap and fast (short prompt, boolean output). Posts with `confidence < 0.7` are skipped.

**Stage 2: Event Extraction** (existing pipeline)
Only for posts classified as events. Uses the existing `fetchAndProcessEvent` with the post caption as `rawText` input. This extracts structured event data (name, date, time, location, description).

### Deduplication Strategy

Three layers of deduplication:

1. **Source URL dedup**: Before processing, check if any event already has this Instagram post URL in its `eventMetadata.sourceUrls`. If so, skip.

2. **Last post tracking**: `instagramSources.lastPostId` tracks the most recent post ID. Only process posts newer than this.

3. **Similarity grouping**: The existing `similarityHelpers` system automatically groups duplicate events (e.g., same event posted by venue and by performer).

### Cron Schedule

```typescript
// convex/crons.ts
crons.interval(
  "check-instagram-sources",
  { hours: 1 },  // Check every hour, but respect per-source intervals
  internal.instagramScraper.checkDueSources,
);
```

Each source has its own `checkIntervalHours` (default: 4). The hourly cron only processes sources where `now - lastCheckedAt > checkIntervalHours`.

### Rate Limiting & Cost Control

- **Per-user limit**: Max 10 Instagram sources per user
- **Check interval**: Minimum 4 hours between checks per source
- **Posts per check**: Only fetch last 12 posts (Instagram's default page)
- **Apify budget**: Set monthly budget cap via Apify dashboard
- **Backoff on errors**: Double interval on consecutive errors (4h → 8h → 16h)

### API Endpoints

#### Mutations (authenticated)
- `instagramSources.add` - Add a new Instagram source
- `instagramSources.remove` - Remove a source
- `instagramSources.pause` / `instagramSources.resume` - Toggle active state
- `instagramSources.checkNow` - Manual trigger (rate-limited to 1/hour)

#### Queries (authenticated)
- `instagramSources.listForUser` - Get all sources for current user
- `instagramSources.getStatus` - Get detailed status of a source

#### HTTP Endpoints (optional, for webhooks)
- `POST /instagram/webhook` - For future Instagram API webhook integration

### Web UI

New page at `/instagram` (or section in settings):

```
┌─────────────────────────────────────────┐
│ Instagram Event Sources                  │
│                                         │
│ Track Instagram accounts that post      │
│ events. We'll automatically capture     │
│ new events as they're posted.           │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ @pdxevents                    ✓ Active │
│ │ Last checked: 2 hours ago          │ │
│ │ 47 posts checked · 12 events found │ │
│ │ [Pause] [Check Now] [Remove]       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ @portland_art_museum          ✓ Active │
│ │ Last checked: 3 hours ago          │ │
│ │ 23 posts checked · 5 events found  │ │
│ │ [Pause] [Check Now] [Remove]       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌──────────────────────┐               │
│ │ Add Instagram account │               │
│ │ @________________     │               │
│ │ [Track Events]        │               │
│ └──────────────────────┘               │
└─────────────────────────────────────────┘
```

### Future Enhancements

1. **Instagram OAuth** - "Connect Instagram" button for official API access
2. **Smart filtering** - ML model trained on which posts are events vs. not
3. **Multi-platform** - Same architecture for TikTok, Facebook Events, Twitter
4. **Collaborative sources** - Share Instagram sources with list members
5. **Event quality scoring** - Rate AI extraction quality, improve prompts
6. **Browser extension** - "Save to Soonlist" button on Instagram.com

## Implementation Plan

### Phase 1: Prototype (this PR)
- [x] Design document
- [ ] `instagramSources` schema table
- [ ] Backend: Apify fetcher + AI classification + event extraction
- [ ] Backend: CRUD mutations/queries for sources
- [ ] Backend: Cron job for periodic checking
- [ ] Web: Management page at `/instagram`

### Phase 2: Polish
- [ ] Error handling and retry logic
- [ ] User notifications on new events found
- [ ] Rate limiting and abuse prevention
- [ ] Cost monitoring dashboard

### Phase 3: Scale
- [ ] Instagram Graph API OAuth flow
- [ ] Webhook support for real-time updates
- [ ] Browser extension
- [ ] Multi-platform support
