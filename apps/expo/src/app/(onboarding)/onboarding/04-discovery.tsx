import React, { useState } from "react";
import { Text, View } from "react-native";
import { toast } from "sonner-native";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";
import { useOnboarding } from "~/hooks/useOnboarding";
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
  const [selectedMethods, setSelectedMethods] = useState<Set<DiscoveryMethod>>(
    new Set(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const { saveStep } = useOnboarding();

  const handleMethodSelect = async (method: DiscoveryMethod) => {
    if (isLoading) return;

    const newSelected = new Set(selectedMethods);

    if (newSelected.has(method)) {
      newSelected.delete(method);
    } else {
      if (newSelected.size >= 2) {
        // Remove the first selected item if already have 2 selections
        const firstSelected = Array.from(newSelected)[0]!;
        newSelected.delete(firstSelected);
      }
      newSelected.add(method);
    }

    setSelectedMethods(newSelected);

    // If we have 2 selections, proceed to next screen
    if (newSelected.size === 2) {
      setIsLoading(true);
      try {
        saveStep(
          "discovery",
          { discoveryMethods: Array.from(newSelected) },
          "/onboarding/05-screenshot",
        );
      } catch (error) {
        toast.error("Something went wrong", {
          description: "Please try again",
        });
        setIsLoading(false);
      }
    }
  };

  const remainingSelections = 2 - selectedMethods.size;

  return (
    <QuestionContainer
      question="Select your top 2 ways to discover events"
      currentStep={4}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View>
        {/* Super obvious counter */}
        <View className="mb-6 items-center">
          <View className="flex-row items-baseline">
            <Text className="text-5xl font-bold text-white">
              {selectedMethods.size}
            </Text>
            <Text className="ml-2 text-2xl text-white/90">/2</Text>
          </View>
          <Text className="mt-2 text-lg font-medium text-white">
            {remainingSelections === 2
              ? "Select TWO options below"
              : remainingSelections === 1
                ? "Select ONE more option"
                : "Perfect! Moving forward..."}
          </Text>
        </View>

        {/* Selection hint */}
        <View className="mb-4 rounded-lg bg-white/20 p-4">
          <Text className="text-center text-base font-medium text-white">
            {remainingSelections === 2
              ? "👇 Tap any two options to continue"
              : remainingSelections === 1
                ? "👇 Tap one more option to continue"
                : "✨ Thanks! Taking you to the next step..."}
          </Text>
        </View>

        {discoveryMethods.map((method) => (
          <QuestionOption
            key={method}
            label={method}
            onPress={() => handleMethodSelect(method)}
            isSelected={selectedMethods.has(method)}
            disabled={isLoading}
          />
        ))}
      </View>
    </QuestionContainer>
  );
}
