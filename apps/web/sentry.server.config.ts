import * as Sentry from "@sentry/nextjs";

import { env } from "./env";

Sentry.init({
  dsn: "https://35d541c34f3a87134429ac75e6513a16@o4503934125998080.ingest.sentry.io/4506458761396224",

  _experiments: {
    enableLogs: true,
  },

  integrations: [
    Sentry.captureConsoleIntegration({ levels: ["error", "warn"] }),
  ],

  tracesSampleRate: 0,

  debug: false,
  enabled: env.NODE_ENV === "production",
});
