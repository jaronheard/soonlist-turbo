import { useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { useConvexAuth } from "convex/react";
import { usePostHog } from "posthog-react-native";

import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { logError } from "~/utils/errorLogging";

export default function AuthAndTokenSync() {
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { login, isInitialized } = useRevenueCat();
  const posthog = usePostHog();

  const userId = user?.id;
  const username = user?.username;
  const email = user?.primaryEmailAddress?.emailAddress;

  // Sync external services based on Convex auth state
  useEffect(() => {
    // Skip if Convex auth is still loading
    if (isLoading) return;

    if (isAuthenticated && userId && username) {
      // User is authenticated in Convex
      Sentry.setUser({ id: userId, username, email });
      posthog.identify(userId, { username, email: email ?? "" });
    } else if (!isAuthenticated) {
      // User is not authenticated in Convex
      Sentry.setUser(null);
      posthog.reset();
    }
  }, [isAuthenticated, isLoading, userId, username, email, posthog]);

  // Sync RevenueCat based on Convex auth state
  useEffect(() => {
    if (isInitialized && isAuthenticated && userId) {
      login(userId).catch((error) => {
        logError("RevenueCat sync error", error);
      });
    }
  }, [isInitialized, isAuthenticated, userId, login]);

  return null;
}
