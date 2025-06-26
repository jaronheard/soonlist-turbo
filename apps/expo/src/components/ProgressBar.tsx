import React from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  backgroundColor: string;
  foregroundColor: string;
}

export function ProgressBar({
  currentStep,
  totalSteps,
  backgroundColor,
  foregroundColor,
}: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;

  const progressStyle = useAnimatedStyle(() => ({
    width: withTiming(`${progress}%`, { duration: 300 }),
  }));

  return (
    <View className={`h-1 mx-6 ${backgroundColor}`}>
      <Animated.View
        className={`h-full ${foregroundColor}`}
        style={progressStyle}
      />
    </View>
  );
}
