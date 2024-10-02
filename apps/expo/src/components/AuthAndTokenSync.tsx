"use client";

import { useEffect, useRef } from "react";
import * as Sentry from "@sentry/react-native";
import { usePostHog } from "posthog-react-native";

import useAuthSync from "~/hooks/useAuthSync";
import { api } from "~/utils/api";

export default function AuthAndTokenSync({
  expoPushToken,
}: {
  expoPushToken: string;
}) {
  const authData = useAuthSync({ expoPushToken });
  const createTokenMutation = api.pushToken.create.useMutation({});
  const posthog = usePostHog();

  const lastSavedTokenRef = useRef<string | null>(null);

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
