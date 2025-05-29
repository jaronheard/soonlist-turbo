# Workflow Failure Notifications Pattern

## Overview

This document describes the failure notification pattern implemented for Convex workflows, specifically demonstrated in the `eventFromImageBase64Workflow`. This pattern provides reliable failure notifications to users when workflow processing fails.

## Architecture

### Core Components

1. **Workflow Implementation** (`eventFromImageBase64Workflow`)

   - Located in `packages/backend/convex/workflows/eventIngestion.ts`
   - Handles end-to-end event creation from image data
   - Uses Convex's built-in workflow failure detection

2. **Failure Notification Action** (`pushFailure`)

   - Located in `packages/backend/convex/internal/notifications.ts`
   - Sends push notifications for workflow failures
   - Includes failure-specific content and metadata

3. **OnComplete Handler** (`onCompleteHandlerForEventFromImageBase64Workflow`)
   - Located in `packages/backend/convex/workflows/eventIngestion.ts`
   - Automatically triggered by Convex workflow manager
   - Handles both success and failure notification scenarios

## Implementation Pattern

### 1. Workflow Setup

```typescript
export const eventFromImageBase64Workflow = workflow.define({
  args: eventFromImageBase64WorkflowValidator,
  handler: eventFromImageBase64WorkflowHandler,
  onComplete:
    internal.workflows.eventIngestion
      .onCompleteHandlerForEventFromImageBase64Workflow,
});
```

The workflow is configured with an `onComplete` callback that automatically executes regardless of workflow success or failure.

### 2. OnComplete Handler Implementation

```typescript
export const onCompleteHandlerForEventFromImageBase64Workflow = internalAction({
  args: v.object({
    runId: v.string(),
    runResult: v.union(
      v.object({ kind: v.literal("success"), returnValue: v.any() }),
      v.object({ kind: v.literal("failed"), error: v.string() }),
    ),
    args: eventFromImageBase64WorkflowValidator,
  }),
  handler: async (ctx, { runResult, args }) => {
    if (runResult.kind === "failed") {
      // Send failure notification
      await ctx.runAction(internal.notifications.pushFailure, {
        userId: args.userId,
        username: args.username,
      });
    } else {
      // Handle success case (existing logic)
      await ctx.runAction(internal.notifications.push, {
        userId: args.userId,
        username: args.username,
        eventId: runResult.returnValue.eventId,
      });
    }
  },
});
```

### 3. Failure Notification Action

```typescript
export const pushFailure = internalAction({
  args: v.object({
    userId: v.id("users"),
    username: v.string(),
  }),
  handler: async (ctx, { userId, username }) => {
    await ctx.runAction(internal.push.push, {
      userId,
      title: "Event creation failed",
      subtitle: `Hi ${username}!`,
      body: "We couldn't create your event from the image. Please try again.",
      isFailure: true,
    });
  },
});
```

## Failure Detection Points

The current implementation automatically detects failures in any of these critical steps:

1. **AI Content Extraction** - When AI fails to extract event details from image
2. **Image Upload** - When image upload to storage fails
3. **Data Validation** - When extracted data fails validation
4. **Database Operations** - When event creation or updates fail
5. **User Operations** - When user-related operations fail

## Key Benefits

### 1. Automatic Failure Detection

- Leverages Convex's built-in workflow failure detection
- No need for manual try-catch blocks around every operation
- Consistent failure handling across all workflow steps

### 2. Reliable Notification Delivery

- `onComplete` callback guaranteed to execute even if workflow fails
- Separate action ensures notification delivery is independent of workflow state
- Proper error isolation prevents notification failures from affecting workflow status

### 3. Comprehensive Error Information

- Access to full error details through `runResult.error`
- User context preserved through workflow arguments
- Distinguishable failure vs. success notifications

## Testing Strategy

### Failure Simulation Functions

The pattern includes comprehensive testing functions to validate failure scenarios:

```typescript
// Test functions in packages/backend/convex/workflows/testFailureNotifications.ts
export const simulateAiExtractionFailure = internalMutation(...)
export const simulateImageUploadFailure = internalMutation(...)
export const simulateValidationFailure = internalMutation(...)
export const simulateDatabaseFailure = internalMutation(...)
```

### Validation Functions

```typescript
export const validateFailureNotification = internalQuery(...)
export const validateWorkflowFailure = internalQuery(...)
```

## Usage Guidelines

### When to Use This Pattern

1. **Long-running workflows** that users expect completion notifications for
2. **Critical user operations** where failure feedback is essential
3. **Multi-step processes** with various potential failure points
4. **User-initiated workflows** triggered from mobile/web interfaces

### Implementation Checklist

- [ ] Define workflow with `onComplete` callback
- [ ] Implement failure notification action
- [ ] Create `onComplete` handler that checks `runResult.kind`
- [ ] Ensure failure notifications have distinct content
- [ ] Add comprehensive testing for failure scenarios
- [ ] Document critical failure points for the specific workflow

## Best Practices

1. **Error Context**: Include relevant context in failure notifications (workflow type, user-friendly error description)
2. **Logging**: Always log detailed error information for debugging
3. **User Experience**: Provide actionable guidance in failure messages
4. **Testing**: Test all identified critical failure points
5. **Monitoring**: Track failure notification rates and common failure types

## Extensibility

This pattern can be applied to other workflows by:

1. Identifying critical failure points in the target workflow
2. Adding an `onComplete` callback to the workflow definition
3. Creating workflow-specific failure notification actions
4. Implementing comprehensive testing for the new workflow's failure scenarios

See section 5.2 for specific guidance on extending this pattern to other workflows in the system.

## 5.2 Extending the Pattern to Other Workflows

### Overview

The failure notification pattern implemented for `eventFromImageBase64Workflow` can be applied to the other event creation workflows in the system. This section analyzes `eventFromUrlThenCreateThenNotification` and `eventFromRawTextThenCreateThenNotification` to identify their critical steps and outline the implementation approach.

### `eventFromUrlThenCreateThenNotification` Workflow

#### Current Implementation Status

- **Location**: `packages/backend/convex/ai.ts` (mutation)
- **Model Functions**: `packages/backend/convex/model/ai.ts` (`processEventFromUrl`)
- **Status**: Currently implemented as a mutation, suitable for conversion to workflow

#### Critical Failure Points

1. **URL Fetching and Content Extraction**

   - Network failures when accessing the URL
   - Invalid URL formats or unreachable URLs
   - Content parsing failures (malformed HTML, protected content)
   - Timeout issues for slow-loading pages

2. **AI Content Processing**

   - AI service failures or rate limiting
   - Invalid or unexpected content format
   - AI extraction returning no events or malformed data
   - Content too large or complex for processing

3. **Data Validation**

   - Invalid event data structure from AI
   - Missing required fields (name, date, etc.)
   - Invalid date/time formats or timezone issues
   - Validation schema failures

4. **Database Operations**

   - Event creation failures
   - User lookup failures
   - List association failures
   - Duplicate event detection issues

5. **Notification Delivery**
   - Push notification service failures
   - Invalid user tokens or permissions
   - Network connectivity issues

#### Implementation Approach

```typescript
// 1. Convert to workflow
export const eventFromUrlWorkflow = workflow.define({
  args: {
    url: v.string(),
    timezone: v.string(),
    userId: v.string(),
    username: v.string(),
    // ... other args
  },
  handler: eventFromUrlWorkflowHandler,
  onComplete: internal.workflows.eventIngestion.onCompleteHandlerForEventFromUrl,
});

// 2. Create workflow handler
const eventFromUrlWorkflowHandler = async (ctx, args) => {
  // Step 1: Fetch and extract content from URL
  const urlContent = await ctx.runAction(internal.ai.extractContentFromUrl, {
    url: args.url
  });

  // Step 2: Process with AI
  const aiResult = await ctx.runAction(internal.ai.processUrlContent, {
    content: urlContent,
    timezone: args.timezone
  });

  // Step 3: Validate event data
  const validatedEvent = await ctx.runAction(internal.ai.validateEventData, {
    events: aiResult.events
  });

  // Step 4: Create event in database
  const eventId = await ctx.runMutation(internal.events.createEvent, {
    event: validatedEvent,
    userId: args.userId,
    // ... other args
  });

  return { eventId, event: validatedEvent };
};

// 3. Create onComplete handler
export const onCompleteHandlerForEventFromUrl = internalAction({
  args: v.object({
    runResult: v.union(
      v.object({ kind: v.literal("success"), returnValue: v.any() }),
      v.object({ kind: v.literal("failed"), error: v.string() })
    ),
    args: /* workflow args validator */,
  }),
  handler: async (ctx, { runResult, args }) => {
    if (runResult.kind === "failed") {
      await ctx.runAction(internal.notifications.pushFailure, {
        userId: args.userId,
        username: args.username,
        context: "URL processing",
      });
    } else {
      await ctx.runAction(internal.notifications.push, {
        userId: args.userId,
        username: args.username,
        eventId: runResult.returnValue.eventId,
      });
    }
  },
});
```

#### Failure Notification Content

```typescript
// URL-specific failure notification
export const pushUrlFailure = internalAction({
  args: v.object({
    userId: v.id("users"),
    username: v.string(),
  }),
  handler: async (ctx, { userId, username }) => {
    await ctx.runAction(internal.push.push, {
      userId,
      title: "Event creation failed",
      subtitle: `Hi ${username}!`,
      body: "We couldn't create your event from the URL. Please check the link and try again.",
      isFailure: true,
    });
  },
});
```

### `eventFromRawTextThenCreateThenNotification` Workflow

#### Current Implementation Status

- **Location**: `packages/backend/convex/ai.ts` (mutation)
- **Model Functions**: `packages/backend/convex/model/ai.ts` (`processEventFromText`)
- **Status**: Currently implemented as a mutation, suitable for conversion to workflow

#### Critical Failure Points

1. **Text Processing and Parsing**

   - Empty or invalid text input
   - Text format issues (encoding, special characters)
   - Content too long or too short for processing
   - Ambiguous or unclear event information

2. **AI Content Extraction**

   - AI service failures or rate limiting
   - Unable to extract meaningful event data from text
   - Ambiguous dates, times, or locations
   - Multiple conflicting interpretations

3. **Data Validation**

   - Invalid event data structure from AI
   - Missing required fields (name, date, etc.)
   - Invalid date/time formats or timezone issues
   - Validation schema failures

4. **Database Operations**

   - Event creation failures
   - User lookup failures
   - List association failures
   - Duplicate event detection issues

5. **Notification Delivery**
   - Push notification service failures
   - Invalid user tokens or permissions
   - Network connectivity issues

#### Implementation Approach

```typescript
// 1. Convert to workflow
export const eventFromTextWorkflow = workflow.define({
  args: {
    rawText: v.string(),
    timezone: v.string(),
    userId: v.string(),
    username: v.string(),
    // ... other args
  },
  handler: eventFromTextWorkflowHandler,
  onComplete:
    internal.workflows.eventIngestion.onCompleteHandlerForEventFromText,
});

// 2. Create workflow handler
const eventFromTextWorkflowHandler = async (ctx, args) => {
  // Step 1: Preprocess and validate text
  const processedText = await ctx.runAction(internal.ai.preprocessText, {
    rawText: args.rawText,
  });

  // Step 2: Extract event data with AI
  const aiResult = await ctx.runAction(internal.ai.extractEventFromText, {
    text: processedText,
    timezone: args.timezone,
  });

  // Step 3: Validate event data
  const validatedEvent = await ctx.runAction(internal.ai.validateEventData, {
    events: aiResult.events,
  });

  // Step 4: Create event in database
  const eventId = await ctx.runMutation(internal.events.createEvent, {
    event: validatedEvent,
    userId: args.userId,
    // ... other args
  });

  return { eventId, event: validatedEvent };
};

// 3. Create onComplete handler (similar to URL workflow)
export const onCompleteHandlerForEventFromText = internalAction({
  // Similar implementation to URL workflow handler
});
```

#### Failure Notification Content

```typescript
// Text-specific failure notification
export const pushTextFailure = internalAction({
  args: v.object({
    userId: v.id("users"),
    username: v.string(),
  }),
  handler: async (ctx, { userId, username }) => {
    await ctx.runAction(internal.push.push, {
      userId,
      title: "Event creation failed",
      subtitle: `Hi ${username}!`,
      body: "We couldn't create your event from the text. Please provide clearer event details and try again.",
      isFailure: true,
    });
  },
});
```

### Common Implementation Considerations

#### Shared Components

1. **Event Validation Logic**: All workflows can use the same `validateEventData` action
2. **Database Operations**: Common event creation and user operations
3. **Notification Infrastructure**: Reuse existing push notification system
4. **Error Logging**: Consistent error logging across all workflows

#### Testing Strategy

1. **Input Validation Testing**

   - Invalid URLs, malformed text, network failures
   - Edge cases specific to each input type

2. **AI Processing Testing**

   - Simulate AI service failures
   - Test with ambiguous or unclear inputs
   - Validate error handling for various AI response formats

3. **Integration Testing**
   - End-to-end workflow testing
   - Failure notification verification
   - Success/failure state validation

#### Migration Path

1. **Phase 1**: Convert existing mutations to workflow handlers
2. **Phase 2**: Implement `onComplete` handlers for failure notifications
3. **Phase 3**: Add comprehensive testing and validation
4. **Phase 4**: Update client-side calls to use workflow endpoints
5. **Phase 5**: Monitor and optimize based on real-world usage

### Benefits of Workflow Conversion

1. **Consistent Error Handling**: All event creation workflows use the same failure notification pattern
2. **Better Observability**: Workflow status tracking and monitoring
3. **Improved Reliability**: Automatic retry and failure detection
4. **User Experience**: Consistent failure notifications across all input types
5. **Maintainability**: Centralized error handling and notification logic
