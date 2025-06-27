import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";
import { useOnboarding } from "~/hooks/useOnboarding";

export default function DemoIntroScreen() {
  const { completeOnboarding } = useOnboarding();

  const handleComplete = async () => {
    await completeOnboarding();
    router.replace("/(tabs)/");
  };

  return (
    <QuestionContainer
      question="You're all set!"
      subtitle="Start exploring events and building your calendar."
      currentStep={8}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="flex-1 justify-center">
        <View className="flex-1" />
        
        <Pressable
          onPress={handleComplete}
          className="bg-white py-4 rounded-full"
        >
          <Text className="text-interactive-1 text-center font-semibold text-lg">
            Get started
          </Text>
        </Pressable>
      </View>
    </QuestionContainer>
  );
}