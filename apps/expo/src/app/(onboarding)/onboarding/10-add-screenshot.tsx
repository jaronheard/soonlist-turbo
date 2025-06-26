import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { ImagePlus } from "~/components/icons";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function AddScreenshotScreen() {
  const handleAddScreenshot = () => {
    // In the real app, this would open the photo picker
    // For now, we'll just navigate to success
    router.push("/(onboarding)/onboarding/11-success");
  };

  const handleSkip = () => {
    router.push("/(onboarding)/onboarding/12-paywall");
  };

  return (
    <QuestionContainer
      question="Add your first screenshot"
      subtitle="Got a screenshot of an event? Let's turn it into a saved plan!"
      currentStep={10}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="flex-1">
        <View className="flex-1 items-center justify-center">
          <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-6">
            <ImagePlus size={40} color="#ffffff" strokeWidth={2} />
          </View>
        </View>

        <Pressable
          onPress={handleAddScreenshot}
          className="bg-white py-4 rounded-full mb-4"
        >
          <Text className="text-interactive-1 text-center font-semibold text-lg">
            Choose Screenshot
          </Text>
        </Pressable>

        <Pressable
          onPress={handleSkip}
          className="py-4"
        >
          <Text className="text-white/70 text-center font-medium">
            Skip for now
          </Text>
        </Pressable>
      </View>
    </QuestionContainer>
  );
}