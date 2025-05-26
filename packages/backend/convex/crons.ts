import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

// import { internal } from "./_generated/api";

const crons = cronJobs();

// Send weekly notifications every Sunday at 9 AM
crons.cron(
  "weekly notifications",
  "0 9 * * 0", // Every Sunday at 9:00 AM
  internal.notifications.sendWeeklyNotifications,
  { cronSecret: process.env.CRON_SECRET || "" },
);

// Send trial expiration reminders daily at 10 AM
crons.cron(
  "trial expiration reminders",
  "0 10 * * *", // Every day at 10:00 AM
  internal.notifications.sendTrialExpirationReminders,
  { cronSecret: process.env.CRON_SECRET || "" },
);

export default crons;
