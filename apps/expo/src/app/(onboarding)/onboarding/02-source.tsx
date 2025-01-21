import React, { useState } from "react";
import { View } from "react-native";
import { router, Stack } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { QuestionOption } from "~/components/QuestionOption";

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

  const handleSourceSelect = (source: Source) => {
    setSelectedSource(source);
    // Store the source in your app state here if needed
    router.push("/feed");
  };

  return (
    <>
      <QuestionContainer
        question="Where did you hear about us?"
        currentStep={2}
        totalSteps={2}
      >
        <View>
          {sources.map((source) => (
            <QuestionOption
              key={source}
              label={source}
              onPress={() => handleSourceSelect(source)}
              isSelected={selectedSource === source}
            />
          ))}
        </View>
      </QuestionContainer>
    </>
  );
}
