import React, { useState } from "react";
import { View } from "react-native";
import { toast } from "sonner-native";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";
import { useOnboarding } from "~/hooks/useOnboarding";
import { useAppStore } from "~/store";
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

  const handleMethodSelect = async (method: DiscoveryMethod) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      saveStep(
        "discovery",
        { discoveryMethods: [method] },
        "/onboarding/05-screenshot",
      );
    } catch (error) {
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
        question="Where do you see the most events?"
        currentStep={4}
        totalSteps={TOTAL_ONBOARDING_STEPS}
      >
        <View>
          {discoveryMethods.map((method) => (
            <QuestionOption
              key={method}
              label={method}
              onPress={() => handleMethodSelect(method)}
              isSelected={onboardingData.discoveryMethods?.includes(method)}
              disabled={isLoading}
            />
          ))}
        </View>
      </QuestionContainer>
    </>
  );
}
