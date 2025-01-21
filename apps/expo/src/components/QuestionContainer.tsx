import React from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

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

  const progressStyle = useAnimatedStyle(() => ({
    width: withTiming(`${progress}%`, { duration: 300 }),
  }));

  return (
    <SafeAreaView className="flex-1 bg-interactive-1">
      <View className="h-1 w-full bg-white">
        <Animated.View
          className="h-full bg-interactive-2"
          style={progressStyle}
        />
      </View>
      <View className="flex-1 px-6 pt-8">
        <Text className="mb-8 text-2xl font-bold text-white">{question}</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}
