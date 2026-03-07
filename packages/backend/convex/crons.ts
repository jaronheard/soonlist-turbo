import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

// Send weekly notifications every Sunday at 9 AM
// crons.cron(
//   "weekly notifications",
//   "0 9 * * 0", // Every Sunday at 9:00 AM
//   internal.notifications.sendWeeklyNotifications,
//   {},
// );

// Send trial expiration reminders daily at 10 AM
crons.cron(
  "trial expiration reminders",
  "0 10 * * *", // Every day at 10:00 AM
  internal.notifications.sendTrialExpirationReminders,
  {},
);

crons.cron(
  "marketing notification",
  "0 0 31 12 *",
  internal.notifications.sendMarketingNotification,
  {
    title: "📸 Soonlist Just Got Better!",
    body: "Tap to explore our streamlined capture flow, event stats & more. Not seeing it? Update in TestFlight.",
    url: "soonlist://feed",
    data: {
      url: "soonlist://feed",
    },
  },
);

// Sync user properties to PostHog daily at 6 AM UTC
crons.cron(
  "posthog user sync",
  "0 6 * * *", // Every day at 6:00 AM UTC
  internal.posthog.syncUserPropertiesToPostHog,
  {},
);

// Update hasEnded flags for userFeeds every 15 minutes
crons.cron(
  "update hasEnded flags",
  "*/15 * * * *", // Every 15 minutes
  internal.feeds.updateHasEndedFlagsAction,
  {},
);

// Update hasEnded flags for userFeedGroups every 15 minutes
crons.cron(
  "update grouped hasEnded flags",
  "*/15 * * * *", // Every 15 minutes
  internal.feeds.updateGroupedHasEndedFlagsAction,
  {},
);

export default crons;
