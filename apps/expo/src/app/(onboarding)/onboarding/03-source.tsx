import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { toast } from "sonner-native";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";
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
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSourceSelect = async (source: Source) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      setSelectedSource(source);
      // Store the source in your app state here if needed
      router.push("/onboarding/04-discovery");
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
        question="Where did you hear about us?"
        currentStep={3}
        totalSteps={TOTAL_ONBOARDING_STEPS}
      >
        <View>
          {sources.map((source) => (
            <QuestionOption
              key={source}
              label={source}
              onPress={() => handleSourceSelect(source)}
              isSelected={selectedSource === source}
              disabled={isLoading}
            />
          ))}
        </View>
      </QuestionContainer>
    </>
  );
}
