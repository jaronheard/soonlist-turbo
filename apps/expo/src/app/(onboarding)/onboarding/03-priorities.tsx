import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";

const priorities = [
  "Making new connections",
  "Getting out more",
  "Being more intentional about what I do",
] as const;

type Priority = (typeof priorities)[number];

export default function PrioritiesScreen() {
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(
    null,
  );

  const handlePrioritySelect = (priority: Priority) => {
    setSelectedPriority(priority);
    // Store the priority in your app state here if needed
    router.push("/onboarding/04-discovery");
  };

  return (
    <QuestionContainer
      question="What matters most to you right now?"
      currentStep={3}
      totalSteps={5}
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
