import React, { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { ChevronDown, Lock, PlusIcon, Sparkles } from "~/components/icons";
import { CircularSpinner } from "~/components/ui/CircularSpinner";
import { useAddEventFlow } from "~/hooks/useAddEventFlow";
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

  const {
    customerInfo,
    isLoading: isRevenueCatLoading,
    showProPaywallIfNeeded,
  } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  const { triggerAddEventFlow } = useAddEventFlow();

  const upcomingEventsCount = stats?.upcomingEvents ?? 0;
  const allTimeEventsCount = stats?.allTimeEvents ?? 0;

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
      {/* Background gradients */}
      <View className="absolute bottom-0 left-0 right-0" pointerEvents="none">
        <View className="absolute bottom-0 h-24 w-full">
          <BlurView
            intensity={10}
            className="h-full w-full opacity-20"
            tint="light"
          />
        </View>
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

      {/* Main action button */}
      {!isRevenueCatLoading && (
        <TouchableOpacity
          onPress={handlePress}
          className="absolute bottom-8 self-center"
        >
          {canProceedWithAdd ? (
            <View className="relative">
              <View
                className="relative flex-row items-center justify-center gap-2 rounded-full bg-interactive-1 p-3"
                style={{
                  shadowColor: "#5A32FB",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 8,
                }}
              >
                <PlusIcon size={44} color="#FFF" strokeWidth={2} />
              </View>

              {/* Spinner Overlay */}
              {isCapturing && (
                <View
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: [{ translateX: -5 }, { translateY: -5 }],
                  }}
                >
                  <CircularSpinner
                    size={76} // Size = button diameter (68) + strokeWidth (4)
                    strokeWidth={4}
                    color="#5A32FB"
                  />
                </View>
              )}
            </View>
          ) : (
            <View className="relative">
              <View
                className="relative flex-row items-center justify-center gap-2 rounded-full bg-interactive-1 p-3"
                style={{
                  shadowColor: "#5A32FB",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 8,
                }}
              >
                <PlusIcon size={44} color="#FFF" strokeWidth={2} />
              </View>
              {/* Lock icon overlay */}
              <View className="absolute bottom-0 right-0 rounded-full bg-white p-1">
                <Lock size={20} color="#5A32FB" strokeWidth={3} />
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
