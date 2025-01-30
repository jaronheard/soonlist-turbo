import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { toast } from "sonner-native";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";
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
  const [selectedAge, setSelectedAge] = useState<AgeRange | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAgeSelect = async (age: AgeRange) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      setSelectedAge(age);
      // Store the age in your app state here if needed
      router.push("/onboarding/03-source");
    } catch (error) {
      toast.error("Something went wrong", {
        description: "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <QuestionContainer
      question="How old are you?"
      currentStep={2}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View>
        {ageRanges.map((age) => (
          <QuestionOption
            key={age}
            label={age}
            onPress={() => handleAgeSelect(age)}
            isSelected={selectedAge === age}
            disabled={isLoading}
          />
        ))}
      </View>
    </QuestionContainer>
  );
}
