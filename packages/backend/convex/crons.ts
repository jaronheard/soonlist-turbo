import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "trial expiration reminders",
  "0 10 * * *", // Every day at 10:00 AM
  internal.notifications.sendTrialExpirationReminders,
  {},
);

crons.cron(
  "posthog user sync",
  "0 6 * * *", // Every day at 6:00 AM UTC
  internal.posthog.syncUserPropertiesToPostHog,
  {},
);

crons.cron(
  "update hasEnded flags",
  "*/15 * * * *", // Every 15 minutes
  internal.feeds.updateHasEndedFlagsAction,
  {},
);

crons.cron(
  "update grouped hasEnded flags",
  "*/15 * * * *", // Every 15 minutes
  internal.feeds.updateGroupedHasEndedFlagsAction,
  {},
);

export default crons;
