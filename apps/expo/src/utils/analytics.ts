import PostHog from "posthog-react-native";

import Config from "~/utils/config";

// Keep a single PostHog instance for the entire application lifecycle.
let posthog: PostHog | null = null;

function getPosthogClient(): PostHog {
  if (!posthog) {
    posthog = new PostHog(Config.posthogApiKey, {
      host: "https://app.posthog.com",
      // Flush events periodically – tweak to your needs
      flushAt: 20,
      captureApplicationLifecycleEvents: true,
      enable: Config.env === "production", // Only send events in production builds
    });
  }

  return posthog;
}

export interface TrackEventProps {
  /** A descriptive event name */
  name: string;
  /** Additional event properties */
  properties?: Record<string, unknown>;
}

/**
 * Capture an analytics event with PostHog. Automatically guards against
 * errors in development or the PostHog library not being correctly initialised.
 */
export function trackEvent({ name, properties }: TrackEventProps) {
  try {
    const client = getPosthogClient();
    client.capture(name, properties ?? {});
  } catch (error) {
    // Silently swallow errors so analytics never crashes the app
    if (Config.env !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[analytics] Failed to capture event", name, error);
    }
  }
}