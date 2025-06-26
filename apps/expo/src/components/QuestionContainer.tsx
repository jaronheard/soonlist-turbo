import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProgressBar } from "./ProgressBar";

interface QuestionContainerProps {
  question: string;
  subtitle?: string;
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  safeAreaEdges?: Array<"top" | "bottom" | "left" | "right">;
}

export function QuestionContainer({
  question,
  subtitle,
  children,
  currentStep,
  totalSteps,
  safeAreaEdges = ["top", "bottom", "left", "right"],
}: QuestionContainerProps) {
  return (
    <SafeAreaView className="flex-1 bg-interactive-1" edges={safeAreaEdges}>
      <ProgressBar
        currentStep={currentStep}
        totalSteps={totalSteps}
        backgroundColor="bg-neutral-3"
        foregroundColor="bg-neutral-1"
      />
      <View className="flex-1 px-6 pt-8">
        <Text className="mb-8 text-3xl font-bold text-white">{question}</Text>
        {subtitle && (
          <Text className="-mt-4 mb-4 text-xl font-medium text-white/80">{subtitle}</Text>
        )}
        {children}
      </View>
    </SafeAreaView>
  );
}
