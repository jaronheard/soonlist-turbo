import React, { useState } from "react";
import { Text, View } from "react-native";
import { toast } from "sonner-native";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";
import { useOnboarding } from "~/hooks/useOnboarding";
import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

const priorities = [
  { text: "Meet new people", emoji: "🤝" },
  { text: "Get out more", emoji: "💃" },
  { text: "No more FOMO", emoji: "😌" },
  { text: "Plan flexibly", emoji: "🤸‍♂️" },
  { text: "Build community", emoji: "🌱" },
] as const;

type Priority = (typeof priorities)[number];

export default function PrioritiesScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { saveStep } = useOnboarding();
  const { onboardingData } = useAppStore();

  const handlePrioritySelect = async (priority: Priority) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      saveStep("priorities", { priority }, "/onboarding/07-we-got-you");
    } catch (error) {
      logError("Failed to save priority", error);
      toast.error("Something went wrong", {
        description: "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <QuestionContainer
      question="What's your main goal?"
      currentStep={6}
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
            isSelected={
              onboardingData.priority?.text === priority.text &&
              onboardingData.priority.emoji === priority.emoji
            }
            disabled={isLoading}
          />
        ))}
      </View>
    </QuestionContainer>
  );
}
