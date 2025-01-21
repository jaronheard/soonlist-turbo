import React from "react";
import { Pressable, Text } from "react-native";

import { cn } from "~/utils/cn";

interface QuestionOptionProps {
  label: string;
  onPress: () => void;
  isSelected?: boolean;
  className?: string;
}

export function QuestionOption({
  label,
  onPress,
  isSelected = false,
  className,
}: QuestionOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "mb-3 w-full rounded-xl border-2 p-4",
        isSelected
          ? "border-interactive-1/30 bg-interactive-2"
          : "border-gray-200 bg-white",
        className,
      )}
    >
      <Text
        className={cn(
          "text-lg",
          isSelected ? "font-medium text-interactive-1" : "text-gray-900",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
