# Notification System Migration to Convex

This document explains the migration of the notification system from tRPC to Convex functions, following Convex best practices for project structure and organization.

## Project Structure

The notification system follows the recommended Convex project structure:

```
convex/
├── model/                    # Business logic helpers (plain TypeScript functions)
│   ├── notifications.ts      # Core notification business logic
│   ├── oneSignal.ts         # OneSignal API integration
│   ├── posthog.ts           # PostHog analytics integration
│   └── ai.ts                # AI text generation utilities
├── notifications.ts         # Public API endpoints (thin wrappers)
├── crons.ts                 # Scheduled notification jobs
└── schema.ts                # Database schema
```

### Why This Structure?

1. **Separation of Concerns**: API endpoints are thin wrappers; business logic lives in helpers
2. **Easier Refactoring**: You can change your API surface or business logic independently
3. **Testability**: Helpers can be tested directly without going through Convex's API layer
4. **Reusability**: Helper functions can be shared across multiple API endpoints

## Available Functions

### Public Actions (External API)

These functions can be called from external systems (e.g., cron jobs, webhooks):


#### `sendSingleNotification`

Send a notification to a specific user.

```typescript
await convex.action(api.notifications.sendSingleNotification, {
  userId: "user123",
  title: "Event Reminder",
  body: "Your event starts in 1 hour",
  url: "/events/123",
});
```

#### `sendWeeklyNotifications`

Send weekly digest notifications to all users.

```typescript
await convex.action(api.notifications.sendWeeklyNotifications, {
  cronSecret: "your-cron-secret",
});
```

#### `sendTrialExpirationReminders`

Send trial expiration reminders to users.

```typescript
await convex.action(api.notifications.sendTrialExpirationReminders, {
  cronSecret: "your-cron-secret",
});
```

### Internal Functions

These functions are private and can only be called by other Convex functions:

- `processUserWeeklyNotification`: Processes weekly notification for a single user
- `generateWeeklyNotificationContentQuery`: Generates notification content for a user
- `getAllUsersQuery`: Retrieves all users from the database
- `getTrialExpirationUsersQuery`: Gets users whose trial expires soon

## Client Usage Examples

### React Components

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function NotificationButton() {
  const sendNotification = useMutation(api.notifications.sendSingleNotification);

  const handleSendNotification = async () => {
    await sendNotification({
      userId: "user123",
      title: "Hello!",
      body: "This is a test notification",
      url: "/dashboard"
    });
  };

  return (
    <button onClick={handleSendNotification}>
      Send Notification
    </button>
  );
}
```

### Server-Side Usage

```typescript
import { ConvexHttpClient } from "convex/browser";

import { api } from "../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

// Trigger weekly notifications
await convex.action(api.notifications.sendWeeklyNotifications, {
  cronSecret: process.env.CRON_SECRET!,
});
```

## Scheduled Jobs

The system includes automated cron jobs defined in `convex/crons.ts`:

- **Weekly Notifications**: Every Sunday at 9:00 AM
- **Trial Expiration Reminders**: Daily at 10:00 AM

## Environment Variables

Make sure these environment variables are configured in your Convex deployment:

```bash
# OneSignal Configuration
ONE_SIGNAL_REST_API_KEY_DEV=your-dev-key
ONE_SIGNAL_REST_API_KEY_PROD=your-prod-key
EXPO_PUBLIC_ONE_SIGNAL_APP_ID_DEV=your-dev-app-id
EXPO_PUBLIC_ONE_SIGNAL_APP_ID_PROD=your-prod-app-id

# PostHog Configuration
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# AI Configuration
ANTHROPIC_API_KEY=your-anthropic-key

# Security
CRON_SECRET=your-cron-secret
```

## Key Features

### AI-Powered Weekly Notifications

For users with 3+ upcoming events, the system generates personalized notification content using Anthropic's Claude model, creating engaging summaries in the style of Spotify's Daylists.

### Robust Error Handling

- Graceful fallbacks when external services are unavailable
- Comprehensive error tracking with PostHog
- Detailed error reporting for debugging

### Analytics Integration

All notification events are tracked in PostHog with detailed metadata for monitoring and optimization.

### Environment-Aware Configuration

Automatically switches between development and production configurations for OneSignal and other services.

## Migration Benefits

1. **Better Performance**: Convex's optimized runtime and caching
2. **Type Safety**: Full TypeScript support with generated types
3. **Real-time Updates**: Built-in reactivity for UI updates
4. **Simplified Architecture**: No need for separate API layer
5. **Better Error Handling**: Convex's built-in error handling and retries
6. **Easier Testing**: Helper functions can be tested independently

## Best Practices

1. **Keep API functions thin**: Most logic should be in helper functions
2. **Use internal functions**: For sensitive operations that shouldn't be public
3. **Proper error handling**: Always handle errors gracefully with fallbacks
4. **Environment configuration**: Use environment variables for configuration
5. **Analytics tracking**: Track important events for monitoring and optimization

## Troubleshooting

### Common Issues

1. **OneSignal not configured**: Check environment variables
2. **AI generation fails**: System falls back to default messages
3. **PostHog tracking issues**: Events are logged but tracking continues
4. **Cron secret mismatch**: Verify CRON_SECRET environment variable

### Debugging

Enable debug logging by checking the Convex dashboard logs for detailed error information and execution traces.
