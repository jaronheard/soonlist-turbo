import { PostHog } from "posthog-node";

// Initialize the client
export const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
  flushAt: 1, // Immediately send events in development
  flushInterval: 0, // Disable batching in development
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
