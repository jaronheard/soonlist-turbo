// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { posthog } from "posthog-js";

import { env } from "./env";

Sentry.init({
  dsn: "https://35d541c34f3a87134429ac75e6513a16@o4503934125998080.ingest.sentry.io/4506458761396224",
  // Set the sample rate to 0 to disable tracing
  tracesSampleRate: 0,
  // Set the session sample rate to 0 to disable capturing entire sessions
  replaysSessionSampleRate: 0,

  // Set the sample rate to 1.0 to capture replays only when an error occurs
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    posthog.sentryIntegration({
      organization: "soonlist",
      projectId: 4506458761396224,
      severityAllowList: ["error", "info"], // optional: here is set to handle captureMessage (info) and captureException (error)
    }),

    Sentry.replayIntegration({
      // Additional SDK configuration goes in here, for example:
      // maskAllText: true,
      // blockAllMedia: true,
    }),
  ],
  enabled: env.NODE_ENV === "production",
});
