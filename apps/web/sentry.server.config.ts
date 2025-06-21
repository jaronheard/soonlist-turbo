// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

import { env } from "./env";

Sentry.init({
  dsn: "https://35d541c34f3a87134429ac75e6513a16@o4503934125998080.ingest.sentry.io/4506458761396224",

  // Enable logs to be sent to Sentry (required for console logging)
  _experiments: {
    enableLogs: true,
  },

  integrations: [
    // Automatically capture console.error and console.warn calls as logs
    Sentry.captureConsoleIntegration({ levels: ["error", "warn"] }),
  ],

  // Set the sample rate to 0 to disable tracing
  tracesSampleRate: 0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  enabled: env.NODE_ENV === "production",
});
