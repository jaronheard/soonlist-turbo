import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { Check } from "~/components/icons";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function SuccessScreen() {
  const handleContinue = () => {
    router.push("/(onboarding)/onboarding/12-paywall");
  };

  return (
    <QuestionContainer
      question="Event saved!"
      subtitle="Great job! You've just saved your first event. You can add more events anytime from screenshots, photos, or links."
      currentStep={11}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="flex-1">
        <View className="flex-1 items-center justify-center">
          <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-6">
            <Check size={40} color="#ffffff" strokeWidth={3} />
          </View>
        </View>

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