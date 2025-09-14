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

  // Sync external services based on Convex auth state with non-blocking approach
  useEffect(() => {
    // Skip if Convex auth is still loading
    if (isLoading) return;

    // Use setTimeout to defer non-critical operations
    const syncTimeout = setTimeout(() => {
      if (isAuthenticated && userId && username) {
        // User is authenticated in Convex
        Sentry.setUser({ id: userId, username, email });
        posthog.identify(userId, { username, email: email ?? "" });
      } else if (!isAuthenticated) {
        // User is not authenticated in Convex
        Sentry.setUser(null);
        posthog.reset();
      }
    }, 300); // Small delay to prioritize UI rendering

    return () => {
      clearTimeout(syncTimeout);
    };
  }, [isAuthenticated, isLoading, userId, username, email, posthog]);

  // Sync RevenueCat based on Convex auth state with non-blocking approach
  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !userId) return;
    
    // Use setTimeout to defer RevenueCat login
    const loginTimeout = setTimeout(() => {
      login(userId).catch((error) => {
        logError("RevenueCat sync error", error);
      });
    }, 800); // Longer delay for less critical operation
    
    return () => {
      clearTimeout(loginTimeout);
    };
  }, [isInitialized, isAuthenticated, userId, login]);

  return null;
}
