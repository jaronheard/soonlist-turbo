import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";
import { useOnboarding } from "~/hooks/useOnboarding";

export default function SeeHowItWorksScreen() {
  const { saveData } = useOnboarding();

  const handleContinue = async () => {
    await saveData({ watchedDemo: true });
    // TODO: Navigate to paywall screen
    router.push("/onboarding/paywall");
  };

  return (
    <QuestionContainer
      question="See how it works"
      subtitle="Watch a quick demo of Soonlist in action"
      currentStep={8}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="flex-1 justify-between">
        <View className="flex-1 items-center justify-center">
          {/* Video placeholder */}
          <View className="h-64 w-full max-w-sm rounded-2xl bg-neutral-2 items-center justify-center">
            <Text className="text-white/60 text-lg">Video Player</Text>
            <Text className="text-white/40 text-sm mt-2">Demo video will play here</Text>
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