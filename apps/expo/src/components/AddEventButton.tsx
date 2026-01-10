import React, { useEffect } from "react";
import { TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { GlassButton } from "~/components/GlassButton";
import { ChevronDown, CloudOff, Lock, PlusIcon } from "~/components/icons";
import { CircularSpinner } from "~/components/ui/CircularSpinner";
import { useAddEventFlow } from "~/hooks/useAddEventFlow";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";

interface EventStats {
  upcomingEvents: number;
  allTimeEvents: number;
  // Other fields from statsQuery.data if needed, but not used in current logic
  // capturesThisWeek: number;
  // weeklyGoal: number;
}
interface AddEventButtonProps {
  showChevron?: boolean;
  stats?: EventStats;
}

/**
 * AddEventButton
 * ---------------
 * Opens the native photo picker (up to 10 images) and creates events for each selected photo in parallel.
 * This bypasses the /add screen for a faster multi‑event creation flow.
 * Paywall logic:
 * - First 3 events are free.
 * - After 3 total captured events, requires "unlimited" entitlement.
 */
export default function AddEventButton({
  showChevron = true,
  stats,
}: AddEventButtonProps) {
  const { isCapturing } = useInFlightEventStore();
  const isOnline = useNetworkStatus();

  const {
    customerInfo,
    isLoading: isRevenueCatLoading,
    showProPaywallIfNeeded,
  } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  const { triggerAddEventFlow } = useAddEventFlow();

  const allTimeEventsCount = stats?.allTimeEvents ?? 0;
  const isStatsLoading = stats === undefined;

  let canProceedWithAdd = false;
  if (allTimeEventsCount < 3) {
    // First 3 captures are always allowed
    canProceedWithAdd = true;
  } else {
    // After 3 captures, requires unlimited subscription
    canProceedWithAdd = hasUnlimited;
  }

  const promptUserToUpgrade = async () => {
    // Navigate to settings/plans page.
    // You might want to adjust this path to your specific subscription/plans screen.
    await showProPaywallIfNeeded();
  };

  const handlePress = canProceedWithAdd
    ? triggerAddEventFlow
    : promptUserToUpgrade;

  /**
   * Small bounce for the chevron hint
   */
  const translateY = useSharedValue(0);
  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(-12, { duration: 500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      translateY.value = 0;
    };
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: -150,
    left: "50%",
    transform: [{ translateX: -32 }, { translateY: translateY.value }],
    zIndex: 10,
  }));

  /**
   * UI
   */
  return (
    <>
      {/* Background gradients - no blur for perf on scrolling content */}
      <View className="absolute bottom-0 left-0 right-0" pointerEvents="none">
        <View className="absolute bottom-0 h-40 w-full">
          <LinearGradient
            colors={["transparent", "#5A32FB"]}
            locations={[0, 1]}
            style={{
              position: "absolute",
              height: "100%",
              width: "100%",
              opacity: 0.3,
            }}
          />
          <LinearGradient
            colors={["transparent", "#E0D9FF"]}
            locations={[0, 1]}
            style={{
              position: "absolute",
              height: "100%",
              width: "100%",
              opacity: 0.1,
            }}
          />
        </View>
      </View>

      {/* Main action button or offline indicator */}
      {!isRevenueCatLoading && !isStatsLoading && (
        <TouchableOpacity
          onPress={handlePress}
          disabled={!isOnline}
          className="absolute bottom-8 self-center"
        >
          {!isOnline ? (
            // Offline indicator - replaces button when offline
            <View className="relative">
              <View
                className="relative flex-row items-center justify-center gap-2 rounded-full bg-neutral-2 p-3"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 8,
                }}
              >
                <CloudOff size={44} color="#FFF" strokeWidth={2} />
              </View>
            </View>
          ) : canProceedWithAdd ? (
            <View className="relative">
              <GlassButton size={70}>
                <PlusIcon size={44} color="#FFF" strokeWidth={2} />
              </GlassButton>

              {/* Spinner Overlay */}
              {isCapturing && (
                <View className="absolute -left-[3.5px] -top-[3.5px] h-[77px] w-[77px] items-center justify-center">
                  <CircularSpinner size={77} strokeWidth={3} color="#5A32FB" />
                </View>
              )}
            </View>
          ) : (
            <View className="relative">
              <GlassButton size={70}>
                <PlusIcon size={44} color="#FFF" strokeWidth={2} />
              </GlassButton>
              {/* Lock icon overlay */}
              <View className="absolute bottom-0 right-0 rounded-full bg-white p-2">
                <Lock
                  id="lock-icon"
                  size={16}
                  color="#5A32FB"
                  strokeWidth={3}
                />
              </View>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Bouncing chevron */}
      {showChevron && (
        <Animated.View style={animatedStyle}>
          <ChevronDown size={64} color="#5A32FB" strokeWidth={4} />
        </Animated.View>
      )}
    </>
  );
}
