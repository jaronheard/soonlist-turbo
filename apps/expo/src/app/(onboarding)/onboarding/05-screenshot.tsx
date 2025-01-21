import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";

const options = ["Yes", "No"] as const;
type Option = (typeof options)[number];

export default function ScreenshotScreen() {
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);

  const handleOptionSelect = (option: Option) => {
    setSelectedOption(option);
    // Store the answer in your app state here if needed
    router.push("/onboarding/06-notifications");
  };

  return (
    <QuestionContainer
      question="Do you screenshot events you want to check out?"
      currentStep={5}
      totalSteps={5}
    >
      <View>
        {options.map((option) => (
          <QuestionOption
            key={option}
            label={option}
            onPress={() => handleOptionSelect(option)}
            isSelected={selectedOption === option}
          />
        ))}
      </View>
    </QuestionContainer>
  );
}
