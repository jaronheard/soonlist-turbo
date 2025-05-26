# AI Functions Migration to Convex

This directory contains the migrated AI functionality from the tRPC router to Convex functions, following Convex best practices.

## Structure

```
ai/
├── index.ts          # Public AI functions (queries and actions)
├── _internal.ts      # Internal functions for AI processing and event creation
├── helpers.ts        # AI processing helpers and utilities
└── README.md         # This file
```

## Functions

### Public Functions (ai/index.ts)

#### Queries

- `eventFromRawText` - Process raw text to extract event information
- `eventsFromUrl` - Process URL content to extract event information
- `eventFromImage` - Process image to extract event information

#### Actions

- `eventFromRawTextThenCreateThenNotification` - Create event from raw text with notification
- `eventFromUrlThenCreateThenNotification` - Create event from URL with notification
- `eventFromImageThenCreateThenNotification` - Create event from image with notification
- `eventFromImageBase64ThenCreate` - Create event from base64 image

### Internal Functions (ai/\_internal.ts)

#### Queries

- `processEventFromRawText` - Internal AI processing for raw text
- `processEventFromUrl` - Internal AI processing for URLs
- `processEventFromImage` - Internal AI processing for images
- `getDailyEventsCount` - Get count of events created today

#### Mutations

- `createEvent` - Create event in database with relations

#### Actions

- `createEventFromRawText` - Orchestrate event creation from raw text
- `createEventFromUrl` - Orchestrate event creation from URL
- `createEventFromImage` - Orchestrate event creation from image
- `createEventFromBase64Image` - Orchestrate event creation from base64 image
- `sendEventNotification` - Send notification for created event

### Helpers (ai/helpers.ts)

Utility functions for AI processing:

- `fetchAndProcessEvent` - Core AI processing logic
- `validateFirstEvent` - Validate extracted event data
- `uploadImageToCDNFromBase64` - Upload base64 images to CDN
- `getDayBounds` - Get day boundaries for timezone

## Migration Notes

### Key Changes from tRPC to Convex

1. **Function Types**: Converted tRPC procedures to Convex queries, mutations, and actions
2. **Validation**: Replaced Zod schemas with Convex validators using `v.*`
3. **Context**: Adapted from tRPC context to Convex context
4. **Error Handling**: Updated to use Convex error patterns
5. **Function Calls**: Changed from direct function calls to `ctx.runQuery`, `ctx.runMutation`, `ctx.runAction`

### Dependencies

The following external dependencies are used:

- `@ai-sdk/openai` - OpenAI integration
- `ai` - AI SDK for structured generation
- `langfuse` - AI observability and logging
- `@js-temporal/polyfill` - Date/time handling

### Environment Variables

Required environment variables:

- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_SECRET_KEY`
- `LANGFUSE_BASE_URL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL`

### TODO

1. **Schema Integration**: Replace mock schemas with actual `@soonlist/cal` schemas
2. **Prompt Integration**: Replace mock prompts with actual prompt system
3. **Notification Integration**: Connect to actual notification system
4. **Error Handling**: Improve error handling and validation
5. **Testing**: Add comprehensive tests for all functions
6. **Performance**: Optimize AI processing and database operations

## Usage

### From Client (Web/Mobile)

```typescript
// Process text to extract event info
const result = await convex.query(api.ai.index.eventFromRawText, {
  rawText: "Concert tomorrow at 8pm",
  timezone: "America/New_York",
});

// Create event from text with notification
const created = await convex.action(
  api.ai.index.eventFromRawTextThenCreateThenNotification,
  {
    rawText: "Concert tomorrow at 8pm",
    timezone: "America/New_York",
    userId: "user123",
    username: "john",
    lists: [],
    sendNotification: true,
  },
);
```

### From Server (Internal)

```typescript
// Process event internally
const result = await ctx.runQuery(
  internal.ai._internal.processEventFromRawText,
  {
    rawText: "Meeting at 2pm",
    timezone: "UTC",
  },
);

// Create event internally
const eventId = await ctx.runMutation(internal.ai._internal.createEvent, {
  userId: "user123",
  username: "john",
  events: [eventData],
  timezone: "UTC",
  lists: [],
});
```

## Architecture Benefits

1. **Separation of Concerns**: Public API, internal logic, and helpers are clearly separated
2. **Type Safety**: Full TypeScript support with Convex validators
3. **Scalability**: Convex handles scaling and performance automatically
4. **Real-time**: Built-in real-time updates for event creation
5. **Observability**: Integrated logging and monitoring with Langfuse
6. **Security**: Internal functions are not exposed to public API
