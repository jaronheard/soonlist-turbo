import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";

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

  const handleMethodSelect = (method: DiscoveryMethod) => {
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
      // Store the methods in your app state here if needed
      setTimeout(() => {
        router.push("/onboarding/05-screenshot");
      }, 500); // Small delay to show the selection
    }
  };

  return (
    <QuestionContainer
      question="Where do you usually discover interesting events? (Pick top 2)"
      currentStep={4}
      totalSteps={5}
    >
      <View>
        {discoveryMethods.map((method) => (
          <QuestionOption
            key={method}
            label={method}
            onPress={() => handleMethodSelect(method)}
            isSelected={selectedMethods.has(method)}
          />
        ))}
      </View>
    </QuestionContainer>
  );
}
