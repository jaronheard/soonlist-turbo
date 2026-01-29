import React, { useState } from "react";
import { View } from "react-native";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";
import { useOnboarding } from "~/hooks/useOnboarding";
import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";
import { toast } from "~/utils/feedback";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

const options = ["Yes", "Not yet"] as const;
type Option = (typeof options)[number];

export default function ScreenshotScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { saveStep } = useOnboarding();
  const { onboardingData } = useAppStore();

  const handleOptionSelect = async (option: Option) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      saveStep(
        "screenshot",
        { screenshotEvents: option },
        "/(onboarding)/onboarding/04-discovery-channels",
      );
    } catch (error) {
      logError("Failed to save screenshot", error);
      toast.error("Something went wrong", "Please try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <QuestionContainer
      question="Do you already screenshot events you're interested in?"
      currentStep={4}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View>
        {options.map((option) => (
          <QuestionOption
            key={option}
            label={option}
            onPress={() => handleOptionSelect(option)}
            isSelected={onboardingData.screenshotEvents === option}
            disabled={isLoading}
          />
        ))}
      </View>
    </QuestionContainer>
  );
}
