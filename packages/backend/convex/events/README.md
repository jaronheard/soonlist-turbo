# Events Convex Functions

This directory contains the Convex functions for event management, migrated from the original tRPC router. The functions are organized following Convex best practices with clear separation between public APIs and internal business logic.

## Structure

```
events/
├── README.md                 # This file
├── events.ts                 # Main public event functions
├── user.ts                   # User-specific event queries
├── _internal.ts              # Internal event business logic
└── user/
    └── _internal.ts          # Internal user-specific event logic
```

## Public Functions

### Main Event Functions (`events.ts`)

- `get(eventId)` - Get an event by ID with all relations
- `getAll()` - Get all events ordered by start date
- `getNext(limit?, excludeCurrent?)` - Get upcoming events
- `getDiscover(userId, limit?, excludeCurrent?)` - Get events for discovery (excluding user's own)
- `getDiscoverInfinite(userId, limit?, cursor?)` - Get discovery events with pagination
- `getEventsForUser(userName, filter, limit?, cursor?)` - Get events for a user with pagination
- `getPossibleDuplicates(startDateTime)` - Find possible duplicate events
- `getStats(userName)` - Get user statistics
- `create(userId, username, event, ...)` - Create a new event
- `update(userId, isAdmin?, id, event, ...)` - Update an existing event
- `deleteEvent(id, userId, isAdmin?)` - Delete an event
- `follow(id, userId)` - Follow an event
- `unfollow(id, userId)` - Unfollow an event
- `addToList(eventId, listId, userId)` - Add event to a list
- `removeFromList(eventId, listId, userId)` - Remove event from a list
- `toggleVisibility(id, visibility, userId)` - Toggle event visibility

### User-Specific Event Functions (`user.ts`)

- `getForUser(userName)` - Get all events for a user
- `getUpcomingForUser(userName)` - Get upcoming events for a user (created and saved)
- `getCreatedForUser(userName)` - Get events created by a user
- `getFollowingForUser(userName)` - Get events that a user is following
- `getFollowingUpcomingForUser(userName)` - Get upcoming events that a user is following
- `getSavedForUser(userName)` - Get saved events for a user
- `getSavedIdsForUser(userName)` - Get saved event IDs for a user

## Internal Functions

### Main Internal Functions (`_internal.ts`)

These functions contain the core business logic and database operations:

- `getEventWithRelations(eventId)` - Get event with all related data
- `getAllEventsWithRelations()` - Get all events with relations
- `getUpcomingEvents(limit?, excludeCurrent)` - Get upcoming events logic
- `getDiscoverEvents(userId, limit?, excludeCurrent)` - Get discovery events logic
- `getDiscoverEventsInfinite(userId, limit, cursor)` - Infinite pagination for discovery
- `getEventsForUserPaginated(userName, filter, limit, cursor)` - User events with pagination
- `findPossibleDuplicates(startDateTime)` - Find duplicate events logic
- `getUserStats(userName)` - Calculate user statistics
- `createEventWithRelations(...)` - Create event with all relations
- `updateEventWithRelations(...)` - Update event with all relations
- `deleteEventWithRelations(...)` - Delete event with all relations
- `followEvent(eventId, userId)` - Follow event logic
- `unfollowEvent(eventId, userId)` - Unfollow event logic
- `addEventToList(eventId, listId, userId)` - Add to list logic
- `removeEventFromList(eventId, listId, userId)` - Remove from list logic
- `toggleEventVisibility(eventId, visibility, userId)` - Toggle visibility logic

### User Internal Functions (`user/_internal.ts`)

These functions handle user-specific event queries:

- `getEventsForUser(userName)` - Get all user events logic
- `getUpcomingEventsForUser(userName)` - Get upcoming user events logic
- `getCreatedEventsForUser(userName)` - Get created events logic
- `getFollowingEventsForUser(userName)` - Get following events logic
- `getFollowingUpcomingEventsForUser(userName)` - Get following upcoming events logic
- `getSavedEventsForUser(userName)` - Get saved events logic
- `getSavedEventIdsForUser(userName)` - Get saved event IDs logic

## Key Features

### Date Handling

- All dates are stored as ISO strings in the database
- Timezone conversion is handled in the `parseDateTime` helper function
- Default timezone is "America/Los_Angeles" if not specified

### Event Relations

- Events include related users, comments, follows, and list associations
- Relations are loaded efficiently using internal queries
- Duplicate events are filtered when combining multiple sources

### Pagination

- Infinite pagination support for discovery and user events
- Cursor-based pagination with configurable limits (1-100)
- Proper next cursor calculation

### Permissions

- Event ownership validation for updates and deletions
- Admin override support for privileged operations
- Visibility controls (public/private events)

### Data Validation

- Comprehensive input validation using Convex validators
- Type-safe function signatures with proper return types
- Error handling with descriptive messages

## Migration Notes

This migration from tRPC to Convex includes the following improvements:

1. **Better Organization**: Functions are split into logical groups with clear separation of concerns
2. **Type Safety**: Full type safety with Convex validators and return types
3. **Performance**: Optimized queries with proper indexing and efficient relation loading
4. **Scalability**: Internal functions can be easily composed and reused
5. **Maintainability**: Clear structure makes it easy to add new features and modify existing ones

## Usage Examples

```typescript
// Get an event with all relations
const event = await ctx.runQuery(api.events.get, { eventId: "event123" });

// Create a new event
const result = await ctx.runMutation(api.events.create, {
  userId: "user123",
  username: "johndoe",
  event: {
    name: "My Event",
    startDate: "2024-01-01",
    startTime: "10:00",
    // ... other event fields
  },
  lists: [],
  visibility: "public",
});

// Get upcoming events for a user
const events = await ctx.runQuery(api.events.user.getUpcomingForUser, {
  userName: "johndoe",
});

// Follow an event
await ctx.runMutation(api.events.follow, {
  id: "event123",
  userId: "user123",
});
```
