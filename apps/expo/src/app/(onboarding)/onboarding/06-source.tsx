import React, { useState } from "react";
import { View } from "react-native";
import { toast } from "sonner-native";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";
import { useOnboarding } from "~/hooks/useOnboarding";
import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

const sources = [
  "Google Search",
  "TikTok",
  "Searched on App Store",
  "Instagram",
  "Facebook",
  "Through a friend",
  "Other",
] as const;

type Source = (typeof sources)[number];

export default function SourceScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { saveStep } = useOnboarding();
  const { onboardingData } = useAppStore();

  const handleSourceSelect = async (source: Source) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      saveStep("source", { source }, "/(onboarding)/onboarding/07-notifications");
    } catch (error) {
      logError("Failed to save source", error);
      toast.error("Something went wrong", {
        description: "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <QuestionContainer
        question="Where did you hear about us?"
        currentStep={6}
        totalSteps={TOTAL_ONBOARDING_STEPS}
      >
        <View>
          {sources.map((source) => (
            <QuestionOption
              key={source}
              label={source}
              onPress={() => handleSourceSelect(source)}
              isSelected={onboardingData.source === source}
              disabled={isLoading}
            />
          ))}
        </View>
      </QuestionContainer>
    </>
  );
}
