# Sentry Error Logging in Soonlist

This document describes how to use Sentry for error tracking and monitoring in the Soonlist mobile app.

## Error Logging Utility

We've implemented a centralized error logging utility that should be used throughout the app instead of `console.error`, `console.log`, and `console.warn`. The utility is located at `src/utils/errorLogging.ts`.

## Available Functions

### 1. Error Logging with `logError`

Import the `logError` function from the error logging utility:

```typescript
import { logError } from "~/utils/errorLogging";
```

Then use it to log errors:

```typescript
try {
  // Your code that might throw an error
} catch (error) {
  logError("Descriptive error message", error);

  // You can still show user-friendly messages if needed
  toast.error("Something went wrong. Please try again.");
}
```

### 2. Non-Error Message Logging with `logMessage`

For important non-error messages that should be tracked in production:

```typescript
import { logMessage } from "~/utils/errorLogging";

// Log an informational message
logMessage("User completed onboarding", { userType: "new", platform: "ios" });

// Log a warning with tags
logMessage(
  "Feature deprecated",
  { featureName: "legacySharing" },
  { type: "warning" },
);
```

### 3. Development-Only Logging with `logDebug`

For debugging messages that should only appear in development:

```typescript
import { logDebug } from "~/utils/errorLogging";

// Debug data that won't be sent to Sentry
logDebug("Processing request", { params, timestamp: Date.now() });
```

### Adding Additional Context

You can add additional data to help with debugging:

```typescript
try {
  // Your code that might throw an error
} catch (error) {
  logError("Error processing image", error, {
    // Replace with your actual image object properties:
    imageId: image.id,
    imageSize: image.size,
    format: image.format,
  });
}
```

### Logging Multiple Errors

For cases where you need to log multiple errors as a group:

```typescript
import { logErrorGroup } from "~/utils/errorLogging";

logErrorGroup("Failed to sync multiple items", errors /* array of Error objects */, {
  batchId: batchId, // unique identifier for the batch
});
```

## Benefits of Using Sentry

1. **Structured Error Data**: Errors are sent with context that makes debugging easier
2. **Error Grouping**: Similar errors are grouped together in the Sentry dashboard
3. **Stack Traces**: Full stack traces are captured automatically
4. **Environment Awareness**: Development vs. production errors are separated
5. **User Context**: Errors can be associated with specific users when they're logged in

## Migration Guide

### From `console.error` to `logError`

**Before:**

```typescript
console.error("Error fetching calendars:", error);
```

**After:**

```typescript
logError("Error fetching calendars", error);
```

### From `console.log` to `logMessage` or `logDebug`

For important logs that should be tracked in production:

**Before:**

```typescript
console.log("User subscription activated:", subscriptionData);
```

**After:**

```typescript
logMessage("User subscription activated", subscriptionData);
```

For development-only debugging:

**Before:**

```typescript
console.log("Debug data:", data);
```

**After:**

```typescript
logDebug("Debug data", data);
```

### From `console.warn` to `logMessage`

**Before:**

```typescript
console.warn("Feature deprecated:", featureName);
```

**After:**

```typescript
logMessage("Feature deprecated", { feature: featureName }, { type: "warning" });
```

## Error Tracking Dashboard

Errors are tracked in the Sentry dashboard at https://soonlist.sentry.io/

## Best Practices

1. Use descriptive error messages that identify the context
2. Include relevant data that will help with debugging
3. Handle errors appropriately for the user experience (e.g., show toast messages)
4. Don't include sensitive user data in error logs
5. Use try/catch blocks around async operations
6. For typed errors, use proper error types when possible
7. Use `logDebug` for temporary debugging that shouldn't go to Sentry
8. Use `logMessage` for important events you want to track in production
