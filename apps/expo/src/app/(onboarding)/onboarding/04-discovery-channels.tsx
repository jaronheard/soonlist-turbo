import React, { useState } from "react";
import { View } from "react-native";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";
import { useOnboarding } from "~/hooks/useOnboarding";
import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";
import { toast } from "~/utils/feedback";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

const discoveryMethods = [
  "Instagram",
  "TikTok",
  "Friends' recommendations",
  "Local websites/newsletters",
  "Walking around town",
  "Facebook",
] as const;

type DiscoveryMethod = (typeof discoveryMethods)[number];

export default function DiscoveryScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { saveStep } = useOnboarding();
  const { onboardingData } = useAppStore();

  const handleMethodSelect = (method: DiscoveryMethod) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      saveStep(
        "discovery",
        { discoveryMethod: method },
        "/(onboarding)/onboarding/05-age",
      );
    } catch (error) {
      logError("Failed to save discovery method", error);
      toast.error("Something went wrong", "Please try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <QuestionContainer
        question="Where do you see the most events?"
        currentStep={5}
        totalSteps={TOTAL_ONBOARDING_STEPS}
      >
        <View>
          {discoveryMethods.map((method) => (
            <QuestionOption
              key={method}
              label={method}
              onPress={() => handleMethodSelect(method)}
              isSelected={onboardingData.discoveryMethod === method}
              disabled={isLoading}
            />
          ))}
        </View>
      </QuestionContainer>
    </>
  );
}
