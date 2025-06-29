import React from "react";
import { Pressable, Text, View } from "react-native";

import { QuestionContainer } from "~/components/QuestionContainer";
import { useOnboarding } from "~/hooks/useOnboarding";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function SeeHowItWorksScreen() {
  const { saveStep } = useOnboarding();

  const handleContinue = () => {
    saveStep("demo", { watchedDemo: true }, "/(onboarding)/onboarding/paywall");
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
          <View className="h-64 w-full max-w-sm items-center justify-center rounded-2xl bg-neutral-2">
            <Text className="text-lg text-white/60">Video Player</Text>
            <Text className="mt-2 text-sm text-white/40">
              Demo video will play here
            </Text>
          </View>
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
