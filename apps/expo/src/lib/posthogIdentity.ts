import type { PostHog } from "posthog-react-native";

export function syncPostHogIdentity(
  posthog: PostHog,
  userId: string,
  properties: Record<string, string | undefined>,
): void {
  try {
    const currentId = posthog.getDistinctId();

    if (currentId && currentId !== userId) {
      posthog.alias(userId);
    }

    const filteredProperties: Record<string, string> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (value !== undefined) {
        filteredProperties[key] = value;
      }
    }

    posthog.identify(userId, filteredProperties);
  } catch (error) {
    console.error("PostHog identity sync error:", error);
  }
}

export function resetPostHogIdentity(posthog: PostHog): void {
  try {
    posthog.reset();
  } catch (error) {
    console.error("PostHog reset error:", error);
  }
}
