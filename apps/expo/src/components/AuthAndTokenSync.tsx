"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { usePostHog } from "posthog-react-native";

import useAuthSync from "~/hooks/useAuthSync";
import { useRevenueCat } from "~/providers/RevenueCatProvider";

export default function AuthAndTokenSync() {
  const { isSignedIn, userId } = useAuth();
  const { login, logout, isInitialized, customerInfo } = useRevenueCat();
  const authData = useAuthSync();
  const posthog = usePostHog();

  useEffect(() => {
    if (!isInitialized) return;

    if (isSignedIn && userId) {
      // Identify user in RevenueCat when they sign in
      void login(userId);
    } else {
      // Logout from RevenueCat handled in ProfileMenu
    }
  }, [isInitialized, isSignedIn, userId, login, logout, customerInfo]);

  useEffect(() => {
    // Reset user identification if authData is null (user logged out)
    if (!authData) {
      Sentry.setUser(null);
      posthog.reset();
    }
  }, [authData, posthog]);

  return null; // This component doesn't render anything
}
