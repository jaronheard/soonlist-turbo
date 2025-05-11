import React, { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface InlineBannerProps {
  message: string;
  onPress?: () => void;
  duration?: number;
  onDismiss?: () => void;
}

export function InlineBanner({
  message,
  onPress,
  duration = 3000,
  onDismiss,
}: InlineBannerProps) {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Animate in
    translateY.value = withTiming(0, { duration: 300 });
    opacity.value = withTiming(1, { duration: 300 });

    // Set timeout to animate out
    timeoutRef.current = setTimeout(() => {
      translateY.value = withTiming(100, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });

      // Call onDismiss after animation completes
      setTimeout(() => {
        onDismiss?.();
      }, 300);
    }, duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [translateY, opacity, duration, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: 20,
          alignSelf: "center",
          zIndex: 1000,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={() => {
          if (onPress) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            translateY.value = withTiming(100, { duration: 300 });
            opacity.value = withTiming(0, { duration: 300 });

            setTimeout(() => {
              onPress();
              onDismiss?.();
            }, 300);
          }
        }}
      >
        <View
          className="rounded-full bg-interactive-1 px-4 py-3"
          style={{
            shadowColor: "#5A32FB",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text className="text-center text-sm font-medium text-white">
            {message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Global reference to active banner
let activeBanner: React.ReactNode | null = null;
let setActiveBanner: React.Dispatch<
  React.SetStateAction<React.ReactNode>
> | null = null;

// Function to register the banner setter
export function registerBannerSetter(
  setter: React.Dispatch<React.SetStateAction<React.ReactNode>>,
) {
  setActiveBanner = setter;
}

// Function to show a banner
export function showInlineBanner(
  message: string,
  onPress?: () => void,
  duration = 3000,
) {
  if (setActiveBanner) {
    // Clear any existing banner
    if (activeBanner) {
      setActiveBanner(null);
    }

    // Create and show new banner
    const banner = (
      <InlineBanner
        message={message}
        onPress={onPress}
        duration={duration}
        onDismiss={() => {
          activeBanner = null;
          setActiveBanner?.(null);
        }}
      />
    );

    activeBanner = banner;
    setActiveBanner(banner);
  }
}
