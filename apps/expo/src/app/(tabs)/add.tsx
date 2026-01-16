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
    // First 3 captures are always allowed
    canProceedWithAdd = true;
  } else {
    // After 3 captures, requires unlimited subscription
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
      // Always navigate back to feed after the flow completes (or is cancelled)
      // Small delay to ensure the photo picker is fully dismissed before navigating
      setTimeout(() => {
        router.navigate("/feed");
      }, 100);
    }
  }, [canProceedWithAdd, triggerAddEventFlow, showProPaywallIfNeeded, router]);

  // Trigger add event flow when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Only trigger once per focus event
      if (!hasTriggeredRef.current && !isRevenueCatLoading && !isStatsLoading) {
        hasTriggeredRef.current = true;
        void handleAddEvent();
      }

      // Reset the ref when leaving the screen
      return () => {
        hasTriggeredRef.current = false;
      };
    }, [handleAddEvent, isRevenueCatLoading, isStatsLoading]),
  );

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <LoadingSpinner />
    </View>
  );
}

export default function AddEventScreen() {
  return (
    <>
      <AuthLoading>
        <View className="flex-1 items-center justify-center bg-white">
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
