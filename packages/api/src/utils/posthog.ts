import { PostHog } from "posthog-node";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";
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

const handleShutdown = async () => {
  try {
    console.log('Flushing PostHog events...');
    await posthog.shutdown();
    console.log('PostHog events flushed successfully');
  } catch (error) {
    console.error('Error flushing PostHog events:', error);
  } finally {
    process.exit(0);
  }
};

// Make sure to flush events before the process exits
process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);
