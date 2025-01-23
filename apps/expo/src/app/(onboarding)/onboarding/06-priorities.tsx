import React, { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";
import { useAppStore } from "~/store";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

const priorities = [
  { text: "Meet new people", emoji: "🤝" },
  { text: "Get out more", emoji: "💃" },
  { text: "Choose intentionally", emoji: "🎯" },
  { text: "Plan flexibly", emoji: "🤸‍♂️" },
  { text: "Build community", emoji: "🌱" },
] as const;

type Priority = (typeof priorities)[number];

export default function PrioritiesScreen() {
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(
    null,
  );
  const setUserPriority = useAppStore((state) => state.setUserPriority);

  const handlePrioritySelect = (priority: Priority) => {
    setSelectedPriority(priority);
    setUserPriority(`${priority.text} ${priority.emoji}`);
    router.push("/onboarding/07-we-got-you");
  };

  return (
    <QuestionContainer
      question="What's your main goal?"
      currentStep={3}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <Text className="-mt-4 mb-4 text-center text-lg text-white">
        I want to...
      </Text>
      <View>
        {priorities.map((priority) => (
          <QuestionOption
            key={priority.text}
            label={priority.text}
            rightIcon={priority.emoji}
            onPress={() => handlePrioritySelect(priority)}
            isSelected={selectedPriority === priority}
          />
        ))}
      </View>
    </QuestionContainer>
  );
}
