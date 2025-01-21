import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";
import { useAppStore } from "~/store";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

const priorities = [
  "🤝 New connections & experiences",
  "🚶 Getting out more",
  "⭐️ Choosing the best event for me",
  "📋 More flexible planning",
  "🌱 Building more community",
] as const;

type Priority = (typeof priorities)[number];

export default function PrioritiesScreen() {
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(
    null,
  );
  const setUserPriority = useAppStore((state) => state.setUserPriority);

  const handlePrioritySelect = (priority: Priority) => {
    setSelectedPriority(priority);
    setUserPriority(priority);
    router.push("/onboarding/07-we-got-you");
  };

  return (
    <QuestionContainer
      question="What matters most to you right now?"
      currentStep={3}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View>
        {priorities.map((priority) => (
          <QuestionOption
            key={priority}
            label={priority}
            onPress={() => handlePrioritySelect(priority)}
            isSelected={selectedPriority === priority}
          />
        ))}
      </View>
    </QuestionContainer>
  );
}
