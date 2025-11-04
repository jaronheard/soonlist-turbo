import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { usePostHog } from "posthog-react-native";

export function PostHogIdentityTracker() {
  const posthog = usePostHog();
  const { userId } = useAuth();
  const { user } = useUser();

  const username = user?.username;
  const email = user?.primaryEmailAddress?.emailAddress;

  useEffect(() => {
    if (userId) {
      if (posthog) {
        const anonymousId = posthog.getDistinctId();
        
        if (anonymousId && anonymousId !== userId) {
          posthog.alias(userId);
        }
        
        const properties: Record<string, string> = {};
        if (username) properties.username = username;
        if (email) properties.email = email;
        posthog.identify(userId, properties);
      }

      // Track user in Sentry
      const sentryUser: { id: string; username?: string; email?: string } = {
        id: userId,
      };
      if (username) sentryUser.username = username;
      if (email) sentryUser.email = email;
      Sentry.setUser(sentryUser);
    } else {
      // Clear user tracking when signed out
      if (posthog) {
        posthog.reset();
      }
      Sentry.setUser(null);
    }
  }, [posthog, userId, username, email]);

  return null;
}
