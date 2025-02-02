import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProgressBar } from "./ProgressBar";

interface QuestionContainerProps {
  question: string;
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
}

export function QuestionContainer({
  question,
  children,
  currentStep,
  totalSteps,
}: QuestionContainerProps) {
  return (
    <SafeAreaView className="flex-1 bg-interactive-1">
      <ProgressBar
        currentStep={currentStep}
        totalSteps={totalSteps}
        backgroundColor="bg-white"
        foregroundColor="bg-interactive-2"
      />
      <View className="flex-1 px-6 pt-8">
        <Text className="mb-8 text-2xl font-bold text-white">{question}</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}
