import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { SocialProofTestimonials } from "~/components/SocialProofTestimonials";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function IntroScreen() {
  const handleContinue = () => {
    router.push("/(onboarding)/onboarding/02-goals");
  };

  return (
    <QuestionContainer
      question="Welcome to Soonlist 👋"
      subtitle="We'll customize your experience based on a few quick questions"
      currentStep={2}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="flex-1 justify-center">
        <View className="flex-1 justify-center">
          <SocialProofTestimonials />
        </View>

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
