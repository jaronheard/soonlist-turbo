import { PostHog } from "posthog-node";

// Initialize the client
export const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
  flushAt: 1, // Immediately send events in development
  flushInterval: 0, // Disable batching in development
});

// Make sure to flush events before the process exits
process.on("SIGTERM", () => {
  posthog.shutdown();
});

process.on("SIGINT", () => {
  posthog.shutdown();
});
