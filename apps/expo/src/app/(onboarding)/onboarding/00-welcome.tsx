import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Layout } from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";
import { router, Stack } from "expo-router";

import { FollowContextBanner } from "~/components/FollowContextBanner";
import { Logo } from "~/components/Logo";
import { useSetHasSeenOnboarding } from "~/store";

const AnimatedView = Animated.createAnimatedComponent(View);

export default function WelcomeScreen() {
  const handleGetStarted = () => {
    router.navigate("/(onboarding)/onboarding/01-intro");
  };

  const setHasSeenOnboarding = useSetHasSeenOnboarding();

  const handleSignIn = () => {
    // Mark as seen onboarding so they skip it after sign-in
    setHasSeenOnboarding(true);

    // Navigate to sign-in screen
    router.navigate("/sign-in");
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
                Save events in one tap. All in one place
              </Text>
            </AnimatedView>
          </View>

          <FollowContextBanner />

          <AnimatedView
            layout={Layout.duration(400)}
            className="flex-1 justify-center"
          >
            <ExpoImage
              // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
              source={require("../../../assets/feed.png")}
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
              className="mb-3 rounded-full bg-interactive-1 py-4"
            >
              <Text className="text-center text-lg font-semibold text-white">
                Get Started
              </Text>
            </Pressable>

            {/* Simple sign in link */}
            <Pressable onPress={handleSignIn} className="py-3">
              <Text className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Text className="font-semibold text-interactive-1">
                  Sign in
                </Text>
              </Text>
            </Pressable>
          </AnimatedView>
        </AnimatedView>
      </View>
    </View>
  );
}
