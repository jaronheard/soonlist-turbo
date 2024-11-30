import { PostHog } from "posthog-node";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

if (!POSTHOG_KEY) {
  throw new Error("PostHog API key is required");
}

// Initialize the client
export const posthog = new PostHog(POSTHOG_KEY, {
  host: POSTHOG_HOST,
  // Only disable batching in development
  ...(IS_DEVELOPMENT && {
    flushAt: 1,
    flushInterval: 0,
  }),
});

function handleShutdown() {
  try {
    console.log("Shutting down PostHog...");
    posthog.shutdown();
    process.exit(0);
  } catch (error) {
    console.error("PostHog shutdown failed:", error);
    process.exit(1);
  }
}

// Gracefully handle shutdown signals
["SIGTERM", "SIGINT"].forEach((signal) => {
  process.on(signal, () => handleShutdown());
});
