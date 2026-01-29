import React, { useState } from "react";
import { View } from "react-native";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";
import { useOnboarding } from "~/hooks/useOnboarding";
import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";
import { toast } from "~/utils/feedback";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

const ageRanges = [
  "Under 24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
] as const;

type AgeRange = (typeof ageRanges)[number];

export default function AgeScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { saveStep } = useOnboarding();
  const { onboardingData } = useAppStore();

  const handleAgeSelect = async (age: AgeRange) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      saveStep("age", { ageRange: age }, "/(onboarding)/onboarding/06-source");
    } catch (error) {
      logError("Failed to save age", error);
      toast.error("Something went wrong", "Please try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <QuestionContainer
      question="How old are you?"
      currentStep={6}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View>
        {ageRanges.map((age) => (
          <QuestionOption
            key={age}
            label={age}
            onPress={() => handleAgeSelect(age)}
            isSelected={onboardingData.ageRange === age}
            disabled={isLoading}
          />
        ))}
      </View>
    </QuestionContainer>
  );
}
