import React from "react";
import { View, Text, Pressable } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { router, Stack } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import Animated, { Layout } from "react-native-reanimated";

import { Logo } from "~/components/Logo";
import { useAppStore } from "~/store";

const AnimatedView = Animated.createAnimatedComponent(View);

export default function WelcomeScreen() {
  const handleGetStarted = () => {
    router.push("/(onboarding)/onboarding/01-intro");
  };

  const handleSignIn = () => {
    // Mark as seen onboarding so they skip it after sign-in
    const setHasSeenOnboarding = useAppStore.getState().setHasSeenOnboarding;
    setHasSeenOnboarding(true);
    
    // Navigate to sign-in screen
    router.push("/sign-in");
  };

  return (
    <View className="flex-1 bg-interactive-3">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 px-4 pb-8 pt-24">
        <AnimatedView className="flex-1" layout={Layout.duration(400)}>
          <View className="shrink-0">
            <AnimatedView
              className="mb-4 items-center"
              layout={Layout.duration(400)}
            >
              <Logo className="h-10 w-40" variant="hidePreview" />
            </AnimatedView>
            <AnimatedView
              className="items-center"
              layout={Layout.duration(400)}
            >
              <Text className="mb-2 text-center font-heading text-4xl font-bold text-gray-700">
                Turn screenshots into{" "}
                <Text className="text-interactive-1">plans</Text>
              </Text>
              <Text className="mb-4 text-center text-lg text-gray-500">
                Save events in one tap. All in one place.
              </Text>
            </AnimatedView>
          </View>

          <AnimatedView
            layout={Layout.duration(400)}
            className="flex-1 justify-center"
          >
            <ExpoImage
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-require-imports
              source={require("../../../assets/feed.png") as ImageSourcePropType}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
              cachePolicy="disk"
              transition={100}
            />
          </AnimatedView>

          <AnimatedView
            className="relative w-full shrink-0"
            layout={Layout.duration(400)}
          >
            {/* Get Started Button */}
            <Pressable
              onPress={handleGetStarted}
              className="bg-interactive-1 py-4 rounded-full mb-3"
            >
              <Text className="text-white text-center font-semibold text-lg">
                Get Started
              </Text>
            </Pressable>

            {/* Simple sign in link */}
            <Pressable
              onPress={handleSignIn}
              className="py-3"
            >
              <Text className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Text className="font-semibold text-interactive-1">Sign in</Text>
              </Text>
            </Pressable>
          </AnimatedView>
        </AnimatedView>
      </View>
    </View>
  );
}