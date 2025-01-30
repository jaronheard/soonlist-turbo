import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { toast } from "sonner-native";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

const options = ["Yes", "Not yet"] as const;
type Option = (typeof options)[number];

export default function ScreenshotScreen() {
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOptionSelect = async (option: Option) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      setSelectedOption(option);
      // Store the answer in your app state here if needed
      router.push("/onboarding/06-priorities");
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
      question="Do you already screenshot events you're interested in?"
      currentStep={5}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View>
        {options.map((option) => (
          <QuestionOption
            key={option}
            label={option}
            onPress={() => handleOptionSelect(option)}
            isSelected={selectedOption === option}
            disabled={isLoading}
          />
        ))}
      </View>
    </QuestionContainer>
  );
}
