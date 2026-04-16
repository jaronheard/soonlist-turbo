# Event Savers & Lists Dialog

Improve how user profiles and list names are linked on event cards. Users should be able to see all savers and all lists an event belongs to, navigate to profiles and list detail pages, and have it feel like a native iOS dialog.

## Card (EventSaversRow) Redesign

**Layout**: Single-row inline flow replacing the stacked avatar group.

- Each user shown as inline avatar (18px) + tappable name pair
- Up to 2 users shown; overflow shown as a purple badge (e.g. `+3`)
- List name shown after "via" (others' events) or "Shared to" (own events), tappable for direct navigation to `/list/[slug]`
- Additional lists shown as a purple badge (e.g. `+2`)
- Both `+N` badges use the same style: `#F0ECFF` background, `#5A32FB` text, rounded pill
- Tapping either `+N` badge opens the "Saved by" page sheet dialog
- Tapping a user name navigates to `/${username}`
- Tapping a list name navigates to `/list/[slug]`
- Remove the existing inline expanded view (`isExpanded` state) entirely

**Edge cases**:
- Single user, single list: no badges shown
- Multiple users, single list: only people `+N` badge
- Single user, multiple lists: only lists `+N` badge
- Own events: show "You" with your avatar, then "Shared to [ListName]"

## "Saved by" Page Sheet Dialog

**Presentation**: `Modal` with `presentationStyle="pageSheet"` and `animationType="slide"`, consistent with `FollowedListsModal`.

**Header**: "Saved by" title (bold, `text-neutral-1`), no Done button (swipe down to dismiss).

**People section**:
- Section header: "PEOPLE" (uppercase, `text-neutral-2`, 12px)
- Creator listed first with subtitle "Captured this event"
- Other savers listed with subtitle "Saved"
- Each row: 40px circular avatar (`bg-interactive-2` fallback) + display name (`font-semibold text-neutral-1`) + role subtitle (`text-neutral-2`) + chevron
- Tap navigates to user profile and dismisses dialog

**Lists section**:
- Section header: "LISTS" (uppercase, `text-neutral-2`, 12px)
- Each row: 40px rounded-square icon (`bg-interactive-2`, List icon in `interactive-1`) + list name (`font-semibold text-neutral-1`) + chevron
- Tap navigates to `/list/[slug]` and dismisses dialog

**Styling**: IBM Plex Sans, Soonlist color tokens (`neutral-1`, `neutral-2`, `neutral-3` for borders, `interactive-1`, `interactive-2`).

## List Detail Page (`/list/[slug]`)

New Expo Router route at `apps/expo/src/app/list/[slug].tsx`.

- Header: list name
- Body: FlatList of events in the list, reusing existing event card components (`UserEventListItem`)
- Follow/unfollow button if the list belongs to another user
- Query existing backend (`api.lists`) for list data + events by slug

## Data Changes

**Feed query** (`getMyFeedGrouped` in `feeds.ts`):
- Currently returns only `sourceListName` (string)
- Add `sourceListId` for navigation
- Expose full `lists[]` array from `enrichEventsAndFilterNulls` so the card can compute `additionalSourceCount` and the dialog can show all lists

**No new backend queries for the dialog** — user data comes from `eventFollows`, list data from `event.lists[]`.

**New query for list detail page** — get list by slug + its events. Check if existing `api.lists` queries can be reused or extended.

**Remove** the `isExpanded` state and expanded render block from `EventSaversRow`.
