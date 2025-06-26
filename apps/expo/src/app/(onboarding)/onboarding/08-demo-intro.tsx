import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function DemoIntroScreen() {
  const handleShowMeHow = () => {
    router.push("/(onboarding)/onboarding/09-screenshot-demo");
  };

  return (
    <QuestionContainer
      question="Let's save your first event!"
      subtitle="We'll walk you through it step by step."
      currentStep={8}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="flex-1 justify-center">
        <View className="flex-1" />
        
        <Pressable
          onPress={handleShowMeHow}
          className="bg-white py-4 rounded-full"
        >
          <Text className="text-interactive-1 text-center font-semibold text-lg">
            Show me how
          </Text>
        </Pressable>
      </View>
    </QuestionContainer>
  );
}