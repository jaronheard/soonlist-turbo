<!-- 24c41f2a-522f-4472-840f-1f27372ed06e 15ef8aa5-4cd9-4009-af28-77e980426e2a -->

# List Infrastructure and Discover Restructure

## Current State Analysis

- **Discover Control**: Currently controlled by `showDiscover` flag on user (`publicMetadata.showDiscover`) and per-event `visibility === "public"` check
- **Discover Feed**: Global feed (`feedId: "discover"`) populated when events are public AND creator has `showDiscover` enabled (see `packages/backend/convex/feedHelpers.ts` lines 72-119)
- **List Follows**: Schema exists (`listFollows` table in `packages/backend/convex/schema.ts` lines 108-114) but needs Convex implementation
- **Personal Lists**: Currently show only created events, not saved events

## Implementation Plan

### Phase 1: List Infrastructure Foundation

**1.1 Convex List Follow Implementation**

- Create `packages/backend/convex/lists.ts` with:
- `followList` mutation (add to `listFollows` table)
- `unfollowList` mutation (remove from `listFollows` table)
- `getFollowedLists` query (get all lists a user follows)
- `getListFollowers` query (get users following a list)
- `isFollowingList` query (check if user follows a list)

**1.2 List-Based Feed Query**

- Create `getFollowedListsFeed` query in `packages/backend/convex/feeds.ts`:
- Aggregates events from all lists the user follows
- Filters by list visibility (only public lists)
- Returns paginated events sorted by start time
- Includes list metadata with each event

**1.3 Feed Helper Updates**

- Update `packages/backend/convex/feedHelpers.ts`:
- Add `updateListFeed` helper to maintain feed when list events change
- Add logic to add events to followers' feeds when added to a list
- Prepare for removing old discover feed logic (will be done in Phase 3)

### Phase 3: Discover Feed Transition

**3.1 Update Discover Feed Logic**

- Replace `getDiscoverFeed` in `packages/backend/convex/feeds.ts`:
- Change from global `discover` feed to `getFollowedListsFeed`
- Remove dependency on `showDiscover` flag
- Remove per-event `showDiscover` check from `feedHelpers.ts` (lines 72-119)

**3.2 Discover Visibility Logic**

- Update `apps/expo/src/app/(tabs)/discover.tsx`:
- Check if user follows at least one list instead of `showDiscover`
- Query `getFollowedLists` to determine visibility
- Hide discover tab if no lists followed
- Update `apps/expo/src/components/NavigationMenu.tsx` similarly (line 47)

**3.3 Remove Old Discover Logic**

- Clean up `showDiscover` references:
- Remove from `feedHelpers.ts` (lines 72-119 in `updateEventInFeeds`)
- Update event creation/update flows to not check `showDiscover`
- Keep `getPlanStatusFromUser` utility but it won't control discover access

**3.4 Web Discover Update**

- Update `apps/web/app/(base)/explore/page.tsx`:
- Use `getFollowedListsFeed` instead of `getDiscoverFeed`
- Add same visibility logic (only show if following lists)

## Key Files to Modify

- `packages/backend/convex/lists.ts` (new)
- `packages/backend/convex/feeds.ts`
- `packages/backend/convex/feedHelpers.ts`
- `apps/expo/src/app/(tabs)/discover.tsx`
- `apps/web/app/(base)/explore/page.tsx`
- `apps/expo/src/components/NavigationMenu.tsx`

## Migration Considerations

- Existing users with `showDiscover: true` need migration path
- Consider auto-following a default/curated list for existing users
- Old discover feed entries can be deprecated gradually
- Need to handle users who currently see discover but don't follow any lists yet@

### To-dos

- [ ] Implement Convex list follow/unfollow mutations and queries (followList, unfollowList, getFollowedLists, isFollowingList)
- [ ] Create getFollowedListsFeed query that aggregates events from all followed lists
- [ ] Update feedHelpers.ts to maintain list-based feeds and prepare for removing old discover logic
- [ ] Replace discover feed to use getFollowedListsFeed instead of global discover feed
- [ ] Update discover visibility logic to check if user follows at least one list instead of showDiscover flag
- [ ] Remove old showDiscover per-event logic from feedHelpers and event flows
