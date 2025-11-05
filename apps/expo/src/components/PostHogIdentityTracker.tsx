import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { usePostHog } from "posthog-react-native";

import {
  resetPostHogIdentity,
  syncPostHogIdentity,
} from "~/lib/posthogIdentity";

export function PostHogIdentityTracker() {
  const posthog = usePostHog();
  const { userId } = useAuth();
  const { user } = useUser();

  const username = user?.username;
  const email = user?.primaryEmailAddress?.emailAddress;

  useEffect(() => {
    if (userId) {
      const properties: Record<string, string | undefined> = {};
      if (username) properties.username = username;
      if (email) properties.email = email;
      syncPostHogIdentity(posthog, userId, properties);

      const sentryUser: { id: string; username?: string; email?: string } = {
        id: userId,
      };
      if (username) sentryUser.username = username;
      if (email) sentryUser.email = email;
      Sentry.setUser(sentryUser);
    } else {
      resetPostHogIdentity(posthog);
      Sentry.setUser(null);
    }
  }, [posthog, userId, username, email]);

  return null;
}
