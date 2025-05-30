import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { useConvexAuth } from "convex/react";
import { usePostHog } from "posthog-react-native";

import useAuthSync from "~/hooks/useAuthSync";
import { useRevenueCat } from "~/providers/RevenueCatProvider";

export default function AuthAndTokenSync() {
  const { isAuthenticated } = useConvexAuth();
  const { userId } = useAuth(); // Still need Clerk's userId for RevenueCat
  const { login, logout, isInitialized, customerInfo } = useRevenueCat();
  const authData = useAuthSync();
  const posthog = usePostHog();

  useEffect(() => {
    if (!isInitialized) return;

    if (isAuthenticated && userId) {
      // Identify user in RevenueCat when they sign in
      void login(userId);
    } else {
      // Logout from RevenueCat handled in ProfileMenu
    }
  }, [isInitialized, isAuthenticated, userId, login, logout, customerInfo]);

  useEffect(() => {
    // Reset user identification if authData is null (user logged out)
    if (!authData) {
      Sentry.setUser(null);
      posthog.reset();
    }
  }, [authData, posthog]);

  return null; // This component doesn't render anything
}
