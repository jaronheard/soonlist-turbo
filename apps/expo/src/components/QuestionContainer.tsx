import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { cn } from "~/utils/cn";
import { ProgressBar } from "./ProgressBar";

interface QuestionContainerProps {
  question: string;
  subtitle?: string;
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  questionTextClassName?: string;
  subtitleTextClassName?: string;
}

export function QuestionContainer({
  question,
  subtitle,
  children,
  currentStep,
  totalSteps,
  questionTextClassName,
  subtitleTextClassName,
}: QuestionContainerProps) {
  return (
    <SafeAreaView className="flex-1 bg-interactive-1">
      <ProgressBar
        currentStep={currentStep}
        totalSteps={totalSteps}
        backgroundColor="bg-neutral-3"
        foregroundColor="bg-neutral-1"
      />
      <View className="flex-1 px-6 pt-8">
        <Text
          className={cn(
            "mb-8 text-3xl font-bold text-white",
            questionTextClassName,
          )}
        >
          {question}
        </Text>
        {subtitle && (
          <Text
            className={cn(
              "-mt-4 mb-4 text-xl font-medium text-white/80",
              subtitleTextClassName,
            )}
          >
            {subtitle}
          </Text>
        )}
        {children}
      </View>
    </SafeAreaView>
  );
}
