import React, { Pressable } from "react";
import { Text } from "react-native";

interface QuestionOptionProps {
  label: string;
  rightIcon?: string;
  onPress: () => void;
  isSelected?: boolean;
}

export function QuestionOption({
  label,
  rightIcon,
  onPress,
  isSelected,
}: QuestionOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`mb-3 flex-row items-center justify-between rounded-xl border-2 px-4 py-3 ${
        isSelected
          ? "border-primary bg-primary/10"
          : "border-gray-700 bg-transparent"
      }`}
    >
      <Text
        className={`text-lg ${isSelected ? "text-primary" : "text-gray-200"}`}
      >
        {label}
      </Text>
      {rightIcon && <Text className="text-xl">{rightIcon}</Text>}
    </Pressable>
  );
}
