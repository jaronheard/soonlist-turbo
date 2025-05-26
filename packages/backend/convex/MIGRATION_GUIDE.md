# Event Router Migration to Convex

This document explains the migration from tRPC to Convex for the event router and demonstrates the recommended Convex project structure.

## Project Structure

Following Convex best practices, the code is organized as follows:

```
convex/
├── model/
│   └── events.ts          # Business logic helpers
├── events.ts              # Public API endpoints
├── schema.ts              # Database schema
└── _generated/            # Auto-generated types
```

### Recommended Structure Explanation

- **`convex/model/`**: Contains plain TypeScript helper functions with business logic. These are not directly exposed as API endpoints.
- **`convex/*.ts`**: Contains public API endpoints (queries, mutations, actions). These files are thin wrappers that mostly call into the helpers in `model/`.

This separation provides:

- **Separation of concerns**: API endpoints are just wrappers; business logic lives in helpers
- **Easier refactoring**: You can change your API surface or business logic independently
- **Testability**: Helpers can be tested directly without going through Convex's API layer

## Migration Changes

### From tRPC to Convex

#### Before (tRPC):

```typescript
export const eventRouter = createTRPCRouter({
  getForUser: publicProcedure
    .input(z.object({ userName: z.string() }))
    .query(async ({ ctx, input }) => {
      // Business logic here
    }),
});
```

#### After (Convex):

```typescript
// convex/model/events.ts - Business logic
export async function getEventsForUser(ctx: QueryCtx, userName: string) {
  // Business logic here
}

// convex/events.ts - API endpoint
export const getForUser = query({
  args: { userName: v.string() },
  handler: async (ctx, args) => {
    return await Events.getEventsForUser(ctx, args.userName);
  },
});
```

### Key Changes

1. **Authentication**: Changed from Clerk session-based auth to Convex identity-based auth
2. **Database queries**: Migrated from Drizzle ORM to Convex database API
3. **Validation**: Changed from Zod to Convex validators (`v.*`)
4. **Error handling**: Using `ConvexError` instead of `TRPCError`
5. **Date handling**: Simplified date parsing (removed Temporal dependency)

## Client Usage

### React Components

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function EventList({ userName }: { userName: string }) {
  // Query events
  const events = useQuery(api.events.getForUser, { userName });

  // Mutation to create event
  const createEvent = useMutation(api.events.create);

  const handleCreate = async (eventData: EventData) => {
    await createEvent({
      event: eventData,
      comment: "My new event",
      lists: [],
      visibility: "public"
    });
  };

  if (events === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {events.map(event => (
        <div key={event.id}>{event.name}</div>
      ))}
    </div>
  );
}
```

### Available Endpoints

#### Queries (Read operations)

- `api.events.getForUser` - Get events for a specific user
- `api.events.getUpcomingForUser` - Get upcoming events for a user
- `api.events.getFollowingForUser` - Get events from followed users/lists
- `api.events.getSavedForUser` - Get saved events
- `api.events.get` - Get single event by ID
- `api.events.getAll` - Get all events
- `api.events.getNext` - Get next upcoming events
- `api.events.getDiscover` - Get discover events (authenticated)
- `api.events.getStats` - Get user statistics

#### Mutations (Write operations)

- `api.events.create` - Create new event
- `api.events.update` - Update existing event
- `api.events.deleteEvent` - Delete event
- `api.events.follow` - Follow an event
- `api.events.unfollow` - Unfollow an event
- `api.events.addToList` - Add event to list
- `api.events.removeFromList` - Remove event from list
- `api.events.toggleVisibility` - Toggle event visibility

### Example Usage Patterns

#### Creating an Event

```typescript
const createEvent = useMutation(api.events.create);

await createEvent({
  event: {
    name: "My Event",
    startDate: "2024-01-15",
    endDate: "2024-01-15",
    startTime: "19:00",
    endTime: "22:00",
    location: "San Francisco, CA",
    description: "A great event",
  },
  comment: "Looking forward to this!",
  lists: [{ value: "list-id-123" }],
  visibility: "public",
});
```

#### Following an Event

```typescript
const followEvent = useMutation(api.events.follow);
await followEvent({ id: "event-id-123" });
```

#### Infinite Scroll for Discovery

```typescript
const { results, status, loadMore } = usePaginatedQuery(
  api.events.getDiscoverInfinite,
  { limit: 20 },
  { initialNumItems: 20 },
);
```

## Schema Changes

Added `eventMetadata` field to the events table:

```typescript
events: defineTable({
  // ... existing fields
  eventMetadata: v.optional(v.any()), // JSON field for event metadata
  // ... rest of fields
});
```

## Authentication

The migration uses Convex's built-in authentication system:

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  throw new ConvexError("User must be logged in");
}
// identity.subject contains the user ID
```

## Error Handling

Convex uses `ConvexError` for throwing errors:

```typescript
if (!event) {
  throw new ConvexError("Event not found");
}
```

## Performance Considerations

1. **Indexes**: Make sure your schema has proper indexes for common query patterns
2. **Pagination**: Use cursor-based pagination for large datasets
3. **Filtering**: Apply filters at the database level when possible
4. **Caching**: Convex automatically handles caching and real-time updates

## Next Steps

1. Update client code to use the new Convex API endpoints
2. Test all functionality to ensure proper migration
3. Implement admin role checking (marked as TODO in the code)
4. Consider adding more specific indexes based on query patterns
5. Add proper error boundaries in React components
