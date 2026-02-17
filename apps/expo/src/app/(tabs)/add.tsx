import { useCallback, useRef } from "react";
import { View } from "react-native";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import LoadingSpinner from "~/components/LoadingSpinner";
import { useAddEventFlow } from "~/hooks/useAddEventFlow";
import { useRevenueCat } from "~/providers/RevenueCatProvider";

function AddEventContent() {
  const router = useRouter();
  const { user } = useUser();
  const { triggerAddEventFlow } = useAddEventFlow();
  const hasTriggeredRef = useRef(false);

  const {
    customerInfo,
    isLoading: isRevenueCatLoading,
    showProPaywallIfNeeded,
  } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  // Fetch user stats for paywall check
  const stats = useQuery(
    api.events.getStats,
    user?.username ? { userName: user.username } : "skip",
  );

  const allTimeEventsCount = stats?.allTimeEvents ?? 0;
  const isStatsLoading = stats === undefined;

  // Determine if user can add events
  let canProceedWithAdd = false;
  if (allTimeEventsCount < 3) {
    canProceedWithAdd = true;
  } else {
    canProceedWithAdd = hasUnlimited;
  }

  const handleAddEvent = useCallback(async () => {
    try {
      if (canProceedWithAdd) {
        await triggerAddEventFlow();
      } else {
        await showProPaywallIfNeeded();
      }
    } finally {
      // Navigate back to feed after the flow completes or is cancelled
      setTimeout(() => {
        router.navigate("/feed");
      }, 100);
    }
  }, [canProceedWithAdd, triggerAddEventFlow, showProPaywallIfNeeded, router]);

  // Trigger add event flow when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!hasTriggeredRef.current && !isRevenueCatLoading && !isStatsLoading) {
        hasTriggeredRef.current = true;
        void handleAddEvent();
      }

      return () => {
        hasTriggeredRef.current = false;
      };
    }, [handleAddEvent, isRevenueCatLoading, isStatsLoading]),
  );

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
      }}
    >
      <LoadingSpinner />
    </View>
  );
}

export default function AddEventScreen() {
  return (
    <>
      <AuthLoading>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
          }}
        >
          <LoadingSpinner />
        </View>
      </AuthLoading>

      <Unauthenticated>
        <Redirect href="/sign-in" />
      </Unauthenticated>

      <Authenticated>
        <AddEventContent />
      </Authenticated>
    </>
  );
}

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
