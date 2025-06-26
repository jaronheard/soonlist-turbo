import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function IntroScreen() {
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
          className="bg-white py-4 rounded-full"
        >
          <Text className="text-interactive-1 text-center font-semibold text-lg">
            Continue
          </Text>
        </Pressable>
      </View>
    </QuestionContainer>
  );
}