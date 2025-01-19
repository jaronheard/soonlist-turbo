"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { usePostHog } from "posthog-react-native";

import useAuthSync from "~/hooks/useAuthSync";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { api } from "~/utils/api";

interface Props {
  expoPushToken: string;
}

export default function AuthAndTokenSync({ expoPushToken }: Props) {
  const { isSignedIn, userId } = useAuth();
  const { login, logout, isInitialized, customerInfo } = useRevenueCat();
  const authData = useAuthSync({ expoPushToken });
  const createTokenMutation = api.pushToken.create.useMutation({});
  const posthog = usePostHog();

  const lastSavedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isInitialized) return;

    if (isSignedIn && userId) {
      // Identify user in RevenueCat when they sign in
      void login(userId);
    } else {
      // Log out from RevenueCat when user signs out
      // prevent logout if anonymous user
      if (customerInfo) {
        void logout();
      }
    }
  }, [isInitialized, isSignedIn, userId, login, logout, customerInfo]);

  useEffect(() => {
    if (
      authData &&
      expoPushToken &&
      expoPushToken !== lastSavedTokenRef.current
    ) {
      createTokenMutation.mutate({
        userId: authData.userId,
        expoPushToken: expoPushToken,
      });
      lastSavedTokenRef.current = expoPushToken;
    }

    // Reset user identification if authData is null (user logged out)
    if (!authData) {
      Sentry.setUser(null);
      posthog.reset();
    }
  }, [expoPushToken, createTokenMutation, authData, posthog]);

  return null; // This component doesn't render anything
}
