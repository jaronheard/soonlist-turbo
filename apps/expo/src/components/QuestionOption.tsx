import React from "react";
import { Pressable, Text } from "react-native";

import { cn } from "~/utils/cn";

interface QuestionOptionProps {
  label: string;
  onPress: () => void;
  isSelected?: boolean;
  rightIcon?: string;
  className?: string;
  disabled?: boolean;
}

export function QuestionOption({
  label,
  onPress,
  isSelected = false,
  className,
  rightIcon,
  disabled = false,
}: QuestionOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "mb-3 w-full flex-row items-center justify-between rounded-xl border-2 p-4",
        isSelected
          ? "border-interactive-1/30 bg-interactive-2"
          : "border-gray-200 bg-white",
        disabled && "opacity-100",
        className,
      )}
    >
      <Text
        className={cn(
          "text-lg",
          isSelected ? "font-medium text-interactive-1" : "text-gray-900",
          disabled && "opacity-100",
        )}
      >
        {label}
      </Text>
      {rightIcon && (
        <Text className={cn("text-xl", disabled && "opacity-100")}>
          {rightIcon}
        </Text>
      )}
    </Pressable>
  );
}
