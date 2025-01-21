import React from "react";
import { Text, View } from "react-native";

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
  const progress = (currentStep / totalSteps) * 100;

  return (
    <View className="flex-1 bg-interactive-3">
      <View className="h-1 w-full bg-gray-200">
        <View
          className="h-full bg-interactive-1 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </View>
      <View className="flex-1 px-6 pt-8">
        <Text className="mb-8 text-2xl font-bold text-gray-900">
          {question}
        </Text>
        {children}
      </View>
    </View>
  );
}
