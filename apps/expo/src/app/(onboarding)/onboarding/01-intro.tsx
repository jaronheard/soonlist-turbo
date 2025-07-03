import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { convex } from "~/lib/convex";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function IntroScreen() {
  // Fetch demo video URL when user reaches intro screen to prepare for later use
  useEffect(() => {
    const timer = setTimeout(() => {
      void (async () => {
        try {
          if (__DEV__) {
            console.log("Fetching demo video URL...");
          }

          const { api } = await import(
            "@soonlist/backend/convex/_generated/api"
          );

          // Fetch video URL from Convex to prepare for later use
          const videoUrl = await convex.query(api.appConfig.getDemoVideoUrl);
          if (videoUrl) {
            if (__DEV__) {
              console.log("Demo video URL fetched:", videoUrl);
            }
          }
        } catch (error) {
          console.log("Failed to fetch demo video URL:", error);
        }
      })();
    }, 1000); // 1 second delay to let the screen load

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    router.push("/(onboarding)/onboarding/02-goals");
  };

  return (
    <QuestionContainer
      question="Welcome to Soonlist 👋"
      subtitle="We'll personalize your experience based on a few quick questions."
      currentStep={2}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="flex-1 justify-center">
        <View className="flex-1" />

        <Pressable
          onPress={handleContinue}
          className="rounded-full bg-white py-4"
        >
          <Text className="text-center text-lg font-semibold text-interactive-1">
            Continue
          </Text>
        </Pressable>
      </View>
    </QuestionContainer>
  );
}
