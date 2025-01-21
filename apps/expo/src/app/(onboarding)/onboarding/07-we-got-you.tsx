import React from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";
import { useAppStore } from "~/store";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function WeGotYouScreen() {
  const userPriority = useAppStore((state) => state.userPriority);

  const getPriorityMessage = () => {
    if (userPriority?.includes("connections")) {
      return "Having all your possibilities in one place will help you make more meaningful connections";
    }
    if (userPriority?.includes("out more")) {
      return "Having all your possibilities in one place will help you get out more";
    }
    if (userPriority?.includes("best event")) {
      return "Having all your possibilities in one place will help you choose the best events";
    }
    if (userPriority?.includes("planning")) {
      return "Having all your possibilities in one place will help you plan more flexibly";
    }
    if (userPriority?.includes("community")) {
      return "Having all your possibilities in one place will help you build more community";
    }
    return "Having all your possibilities in one place will help you do more of what matters";
  };

  return (
    <QuestionContainer
      question=""
      currentStep={7}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="flex-1 items-center justify-center px-4">
        <Text className="mb-4 text-center text-4xl font-bold text-white">
          💖 We got you
        </Text>
        <Text className="mb-12 text-center text-2xl text-white">
          {getPriorityMessage()}
        </Text>
      </View>
      <QuestionOption
        label="Continue"
        onPress={() => router.push("/onboarding/demo-intro")}
      />
    </QuestionContainer>
  );
}
