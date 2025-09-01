import { useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { useConvexAuth } from "convex/react";
import { usePostHog } from "posthog-react-native";

import { useAuthStateManager } from "~/hooks/useAuthStateManager";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { logDebug, logError } from "~/utils/errorLogging";

export default function AuthAndTokenSync() {
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { login, isInitialized } = useRevenueCat();
  const posthog = usePostHog();
  const { isRecovering, resetRecoveryAttempts } = useAuthStateManager();

  const userId = user?.id;
  const username = user?.username;
  const email = user?.primaryEmailAddress?.emailAddress;

  // Sync external services based on Convex auth state
  useEffect(() => {
    // Skip if Convex auth is still loading or recovering
    if (isLoading || isRecovering) return;

    if (isAuthenticated && userId && username) {
      // User is authenticated in Convex
      Sentry.setUser({ id: userId, username, email });
      posthog.identify(userId, { username, email: email ?? "" });
      
      // Reset recovery attempts counter when successfully authenticated
      resetRecoveryAttempts().catch((error) => {
        logError("Failed to reset recovery attempts", error);
      });
      
      logDebug("Auth sync: User authenticated", { userId, username });
    } else if (!isAuthenticated) {
      // User is not authenticated in Convex
      Sentry.setUser(null);
      posthog.reset();
      
      logDebug("Auth sync: User not authenticated");
    }
  }, [isAuthenticated, isLoading, userId, username, email, posthog, isRecovering, resetRecoveryAttempts]);

  // Sync RevenueCat based on Convex auth state
  useEffect(() => {
    if (isInitialized && isAuthenticated && userId && !isRecovering) {
      login(userId).catch((error) => {
        logError("RevenueCat sync error", error);
      });
    }
  }, [isInitialized, isAuthenticated, userId, login, isRecovering]);

  return null;
}
