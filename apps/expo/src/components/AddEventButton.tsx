import React, { useEffect } from "react";
import { TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { GlassButton } from "~/components/GlassButton";
import { ChevronDown, CloudOff, PlusIcon } from "~/components/icons";
import { CircularSpinner } from "~/components/ui/CircularSpinner";
import { useAddEventFlow } from "~/hooks/useAddEventFlow";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";

interface AddEventButtonProps {
  showChevron?: boolean;
  /** Additional bottom offset to account for tab bar */
  bottomOffset?: number;
}

/**
 * AddEventButton
 * ---------------
 * Opens the native photo picker (up to 10 images) and creates events for each selected photo in parallel.
 * All features are free — no subscription gating.
 */
export default function AddEventButton({
  showChevron = true,
  bottomOffset = 100,
}: AddEventButtonProps) {
  const isCapturing = useInFlightEventStore((s) => s.isCapturing);
  const isOnline = useNetworkStatus();
  const insets = useSafeAreaInsets();

  const { triggerAddEventFlow } = useAddEventFlow();

  const handlePress = triggerAddEventFlow;

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
            className="absolute h-full w-full opacity-30"
          />
          <LinearGradient
            colors={["transparent", "#E0D9FF"]}
            locations={[0, 1]}
            className="absolute h-full w-full opacity-10"
          />
        </View>
      </View>

      {/* Main action button or offline indicator */}
      <TouchableOpacity
        onPress={handlePress}
        disabled={!isOnline || isCapturing}
        className="absolute self-center"
        style={{ bottom: bottomOffset + insets.bottom }}
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
                elevation: 6,
              }}
            >
              <CloudOff size={44} color="#FFF" strokeWidth={2} />
            </View>
          </View>
        ) : (
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
        )}
      </TouchableOpacity>

      {/* Bouncing chevron */}
      {showChevron && (
        <Animated.View style={animatedStyle}>
          <ChevronDown size={64} color="#5A32FB" strokeWidth={4} />
        </Animated.View>
      )}
    </>
  );
}
