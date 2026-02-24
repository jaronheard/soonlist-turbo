import React, { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, router, useIsFocused } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import { useAddEventFlow } from "~/hooks/useAddEventFlow";
import { useAppStore } from "~/store";

function CaptureContent() {
  const { user } = useUser();
  const isFocused = useIsFocused();
  const hasTriggered = useRef(false);
  const { triggerAddEventFlow } = useAddEventFlow();

  useEffect(() => {
    if (!isFocused || hasTriggered.current || !user) {
      return;
    }

    hasTriggered.current = true;

    const run = async () => {
      await triggerAddEventFlow();

      // Navigate back after the flow completes
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/feed");
      }
    };

    void run();
  }, [isFocused, user, triggerAddEventFlow]);

  // Reset trigger when tab loses focus so it can trigger again
  useEffect(() => {
    if (!isFocused) {
      hasTriggered.current = false;
    }
  }, [isFocused]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F4F1FF",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator size="large" color="#5A32FB" />
    </View>
  );
}

export default function CaptureTab() {
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);

  return (
    <>
      <AuthLoading>
        <View
          style={{
            flex: 1,
            backgroundColor: "#F4F1FF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color="#5A32FB" />
        </View>
      </AuthLoading>

      <Unauthenticated>
        {!hasSeenOnboarding ? (
          <Redirect href="/(onboarding)/onboarding" />
        ) : (
          <Redirect href="/sign-in" />
        )}
      </Unauthenticated>

      <Authenticated>
        <CaptureContent />
      </Authenticated>
    </>
  );
}

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
