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
    if (userPriority?.includes("Meet new people")) {
      return "See all your possibilities in one place—never miss a chance to connect.";
    }
    if (userPriority?.includes("Get out more")) {
      return "See all your possibilities in one place—always have options ready.";
    }
    if (userPriority?.includes("Choose intentionally")) {
      return "See all your possibilities in one place—make choices that matter.";
    }
    if (userPriority?.includes("Plan flexibly")) {
      return "See all your possibilities in one place—decide when you're ready.";
    }
    if (userPriority?.includes("Build community")) {
      return "See all your possibilities in one place—bring people together.";
    }
    return "See all your possibilities in one place—do more of what matters.";
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
