import React, { useEffect } from "react";
import { Dimensions, Platform, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ScreenCapture from "expo-screen-capture";

import { QuestionContainer } from "~/components/QuestionContainer";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function ScreenshotDemoScreen() {
  const powerButtonOpacity = useSharedValue(0.7);
  const volumeButtonOpacity = useSharedValue(0.7);
  const powerButtonScale = useSharedValue(1);
  const volumeButtonScale = useSharedValue(1);
  const powerButtonWidth = useSharedValue(4);
  const volumeButtonWidth = useSharedValue(4);
  const powerButtonHeight = useSharedValue(60);
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get("window").height;

  // Detect if it's an iPhone with Face ID (notch/dynamic island)
  const hasFaceID = insets.top > 20;

  // For older iPhones (8 and below), both buttons are on top right
  // For newer iPhones (X and above), power is on right, volume on left
  const isOlderiPhone = !hasFaceID && Platform.OS === "ios";

  useEffect(() => {
    // Very subtle synchronized breathing animation
    // Start from current values to avoid jump
    powerButtonOpacity.value = withTiming(0.7, { duration: 0 });
    volumeButtonOpacity.value = withTiming(0.7, { duration: 0 });
    powerButtonWidth.value = withTiming(4, { duration: 0 });
    volumeButtonWidth.value = withTiming(4, { duration: 0 });
    powerButtonHeight.value = withTiming(4, { duration: 0 });

    // Then start the animations
    powerButtonOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, {
          duration: 3000,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
        }),
        withTiming(0.7, {
          duration: 3000,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
        }),
      ),
      -1,
    );

    volumeButtonOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, {
          duration: 3000,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
        }),
        withTiming(0.7, {
          duration: 3000,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
        }),
      ),
      -1,
    );

    // Remove scale animation - too distracting
    powerButtonScale.value = 1;
    volumeButtonScale.value = 1;

    // Very subtle width breathing
    powerButtonWidth.value = withRepeat(
      withSequence(
        withTiming(5, {
          duration: 3000,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
        }),
        withTiming(4, {
          duration: 3000,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
        }),
      ),
      -1,
    );

    volumeButtonWidth.value = withRepeat(
      withSequence(
        withTiming(5, {
          duration: 3000,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
        }),
        withTiming(4, {
          duration: 3000,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
        }),
      ),
      -1,
    );

    // For older iPhones, animate height instead of width for top power button
    if (isOlderiPhone) {
      powerButtonHeight.value = withRepeat(
        withSequence(
          withTiming(5, {
            duration: 3000,
            easing: Easing.bezier(0.4, 0, 0.6, 1),
          }),
          withTiming(4, {
            duration: 3000,
            easing: Easing.bezier(0.4, 0, 0.6, 1),
          }),
        ),
        -1,
      );
    }
  }, [
    powerButtonOpacity,
    volumeButtonOpacity,
    powerButtonScale,
    volumeButtonScale,
    powerButtonWidth,
    volumeButtonWidth,
    powerButtonHeight,
    isOlderiPhone,
  ]);

  const handleContinue = () => {
    router.push("/(onboarding)/onboarding/10-add-screenshot");
  };

  useEffect(() => {
    let hasNavigated = false;

    const subscription = ScreenCapture.addScreenshotListener(() => {
      if (!hasNavigated) {
        hasNavigated = true;
        console.log("Screenshot detected! Navigating...");
        // Add a slight delay before navigating
        setTimeout(() => {
          router.push("/(onboarding)/onboarding/10-add-screenshot");
        }, 800); // 800ms delay
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const powerButtonStyle = useAnimatedStyle(() => ({
    opacity: powerButtonOpacity.value,
    width: powerButtonWidth.value,
    transform: [{ scale: powerButtonScale.value }],
  }));

  const powerButtonStyleOld = useAnimatedStyle(() => ({
    opacity: powerButtonOpacity.value,
    height: powerButtonHeight.value,
    transform: [{ scale: powerButtonScale.value }],
  }));

  const volumeButtonStyle = useAnimatedStyle(() => ({
    opacity: volumeButtonOpacity.value,
    width: volumeButtonWidth.value,
    transform: [{ scale: volumeButtonScale.value }],
  }));

  return (
    <>
      <QuestionContainer
        question="Take a screenshot"
        subtitle={
          isOlderiPhone
            ? "Press the home button + power button together"
            : "Press the side button + volume up together"
        }
        currentStep={9}
        totalSteps={TOTAL_ONBOARDING_STEPS}
      >
        <View className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <View className="w-full bg-accent-yellow p-4">
              {/* Top decorative elements */}
              <View className="mb-3 flex-row justify-center gap-6">
                <Text className="text-3xl">✨</Text>
                <Text className="text-3xl">🌟</Text>
                <Text className="text-3xl">💫</Text>
              </View>

              <Text className="mb-3 text-center text-5xl">🎉</Text>

              <View className="mb-6">
                <Text className="mb-1 text-center text-4xl font-black text-neutral-1">
                  SOONLIST
                </Text>
                <Text className="text-center text-3xl font-black text-neutral-1">
                  PARTY
                </Text>
              </View>

              <View className="mb-4 rounded-3xl bg-white/60 p-4 shadow-lg">
                <View className="mb-3 flex-row items-center justify-center">
                  <Text className="mr-2 text-2xl">📅</Text>
                  <Text className="text-lg font-bold text-neutral-1">
                    Tomorrow • 7PM
                  </Text>
                </View>
                <View className="mb-4 flex-row items-center justify-center">
                  <Text className="mr-2 text-2xl">📍</Text>
                  <Text className="text-lg font-bold text-neutral-1">
                    Your favorite spot
                  </Text>
                </View>

                <View className="mt-4 border-t border-neutral-2 pt-4">
                  <Text className="text-center text-base font-medium leading-relaxed text-neutral-1">
                    Join us to explore{"\n"}the magic of Soonlist!
                  </Text>
                </View>
              </View>

              <View className="mb-4 flex-row justify-center gap-3">
                <Text className="text-2xl">🎈</Text>
                <Text className="text-2xl">🎊</Text>
                <Text className="text-2xl">🎁</Text>
              </View>

              <Text className="mb-4 text-center text-sm font-medium text-neutral-2">
                Screenshot this poster!
              </Text>

              <View className="flex-row justify-center gap-6">
                <Text className="text-3xl">🌈</Text>
                <Text className="text-3xl">⚡</Text>
                <Text className="text-3xl">🎯</Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleContinue}
            className="mx-6 rounded-full bg-white py-4"
          >
            <Text className="text-center text-lg font-semibold text-interactive-1">
              I took a screenshot
            </Text>
          </Pressable>
        </View>
      </QuestionContainer>

      {/* Button overlays positioned at actual button locations */}
      {!isOlderiPhone ? (
        <>
          {/* Side button for newer iPhones */}
          <Animated.View
            style={[
              powerButtonStyle,
              {
                position: "absolute",
                right: 0,
                top: screenHeight * 0.2,
                height: 60,
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                borderRadius: 0,
                borderTopLeftRadius: 2,
                borderBottomLeftRadius: 2,
                shadowColor: "#fff",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
              },
            ]}
          />

          {/* Volume up button */}
          <Animated.View
            style={[
              volumeButtonStyle,
              {
                position: "absolute",
                left: 0,
                top: screenHeight * 0.15,
                height: 80,
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                borderRadius: 0,
                borderTopRightRadius: 2,
                borderBottomRightRadius: 2,
                shadowColor: "#fff",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
              },
            ]}
          />
        </>
      ) : (
        <>
          {/* Power button for older iPhones (top) */}
          <Animated.View
            style={[
              powerButtonStyleOld,
              {
                position: "absolute",
                right: 30,
                top: 0,
                width: 60,
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                borderRadius: 0,
                borderBottomLeftRadius: 2,
                borderBottomRightRadius: 2,
                shadowColor: "#fff",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
              },
            ]}
          />

          {/* Home button for older iPhones */}
          <Animated.View
            style={[
              volumeButtonStyle,
              {
                position: "absolute",
                bottom: insets.bottom + 20,
                left: "50%",
                marginLeft: -25,
                width: 50,
                height: 50,
                backgroundColor: "transparent",
                borderRadius: 25,
                borderWidth: 2,
                borderColor: "rgba(255, 255, 255, 0.9)",
                shadowColor: "#fff",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
              },
            ]}
          />
        </>
      )}
    </>
  );
}
