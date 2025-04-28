import React, { useCallback, useEffect } from "react";
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
import * as MediaLibrary from "expo-media-library";
import { router } from "expo-router";

import { ChevronDown, PlusIcon, Sparkles } from "~/components/icons";
import { fetchRecentPhotos } from "~/hooks/useMediaLibrary";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { logError } from "../utils/errorLogging";

interface AddEventButtonProps {
  showChevron?: boolean;
}

export default function AddEventButton({
  showChevron = true,
}: AddEventButtonProps) {
  const { resetAddEventState, setImagePreview, setInput } = useAppStore();
  const { customerInfo, showProPaywallIfNeeded } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  const translateY = useSharedValue(0);

  // Start animation on mount
  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(-12, {
        duration: 500,
        easing: Easing.inOut(Easing.sin),
      }),
      -1, // Infinite repeats
      true, // Reverse animation
    );

    return () => {
      translateY.value = 0; // Reset value and cancel any ongoing animation
    };
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      top: -150,
      left: "50%",
      transform: [{ translateX: -32 }, { translateY: translateY.value }],
      zIndex: 10,
    };
  });

  const handlePress = useCallback(async () => {
    if (!hasUnlimited) {
      await showProPaywallIfNeeded();
      return;
    }

    resetAddEventState();

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== MediaLibrary.PermissionStatus.GRANTED) {
        router.push("/add");
        return;
      }

      const photos = await fetchRecentPhotos();

      if (photos?.[0]?.uri) {
        const firstUri = photos[0].uri;
        setImagePreview(firstUri, "add");
        const filename = firstUri.split("/").pop() || "";
        setInput(filename, "add");
      }

      router.push("/add");
    } catch (error) {
      logError("Error in AddEventButton", error);
      router.push("/add");
    }
  }, [
    hasUnlimited,
    showProPaywallIfNeeded,
    resetAddEventState,
    setImagePreview,
    setInput,
  ]);

  return (
    <View className="absolute bottom-0 left-0 right-0">
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

      {hasUnlimited ? (
        <TouchableOpacity
          onPress={handlePress}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
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
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={handlePress}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <View
            className="w-full flex-row items-center justify-center rounded-full bg-interactive-1 px-3 py-3.5"
            style={{
              shadowColor: "#5A32FB",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 8,
            }}
          >
            <Sparkles size={20} color="#FFF" />
            <Text className="ml-2 text-2xl font-bold text-white">
              Start your free trial
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {showChevron && (
        <Animated.View style={animatedStyle}>
          <ChevronDown size={64} color="#5A32FB" strokeWidth={4} />
        </Animated.View>
      )}
    </View>
  );
}
