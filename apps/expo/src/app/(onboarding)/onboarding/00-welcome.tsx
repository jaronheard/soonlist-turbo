import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { router, Stack } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { useOAuth } from "@clerk/clerk-expo";

import { Logo } from "~/components/Logo";
import { AppleSignInButton } from "~/components/AppleSignInButton";
import { GoogleSignInButton } from "~/components/GoogleSignInButton";
import { EmailSignInButton } from "~/components/EmailSignInButton";
import { X } from "~/components/icons";
import { useAppStore } from "~/store";

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function WelcomeScreen() {
  const [showSignInOptions, setShowSignInOptions] = useState(false);
  const { startOAuthFlow: _startGoogleOAuthFlow } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: _startAppleOAuthFlow } = useOAuth({
    strategy: "oauth_apple",
  });

  const handleGetStarted = () => {
    router.push("/(onboarding)/onboarding/01-intro");
  };

  const toggleSignInOptions = () => {
    setShowSignInOptions(!showSignInOptions);
  };

  const handleOAuthFlow = async (_strategy: "oauth_google" | "oauth_apple") => {
    // Mark as seen onboarding so they go to sign-in screen 
    const setHasSeenOnboarding = useAppStore.getState().setHasSeenOnboarding;
    setHasSeenOnboarding(true);
    
    // Navigate to sign-in which will handle the OAuth flow
    router.push("/(auth)/sign-in");
  };

  const navigateToEmailSignUp = () => {
    // Mark as seen onboarding
    const setHasSeenOnboarding = useAppStore.getState().setHasSeenOnboarding;
    setHasSeenOnboarding(true);
    
    router.push("/sign-up-email");
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
                Save events{" "}
                <Text className="text-interactive-1">instantly</Text>
              </Text>
              <Text className="mb-4 text-center text-lg text-gray-500">
                Turn your screenshots into a social calendar
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

            {/* Have an account button - minimal style */}
            <AnimatedPressable
              onPress={toggleSignInOptions}
              className="relative flex-row items-center justify-center py-2"
            >
              <Text className="text-sm font-medium text-interactive-1">
                Already have an account?
              </Text>
              {showSignInOptions && (
                <View className="absolute right-0">
                  <X size={16} color="#7c3aed" />
                </View>
              )}
            </AnimatedPressable>

            {showSignInOptions && (
              <AnimatedView
                entering={FadeIn.duration(400)}
                exiting={FadeOut.duration(300)}
                layout={Layout.duration(400)}
                className="absolute bottom-full w-full"
              >
                <View className="h-3" />
                <EmailSignInButton onPress={navigateToEmailSignUp} />
                <View className="h-3" />
                <GoogleSignInButton
                  onPress={() => void handleOAuthFlow("oauth_google")}
                />
                <View className="h-3" />
                <AppleSignInButton
                  onPress={() => void handleOAuthFlow("oauth_apple")}
                />
                <View className="h-3" />
              </AnimatedView>
            )}
          </AnimatedView>
        </AnimatedView>
      </View>
    </View>
  );
}