import type { AccessibilityState } from "react-native";
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
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "radio" | "checkbox";
  accessibilityState?: AccessibilityState;
}

export function QuestionOption({
  label,
  onPress,
  isSelected = false,
  className,
  rightIcon,
  disabled = false,
  accessibilityLabel,
  accessibilityRole = "button",
  accessibilityState,
}: QuestionOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={
        accessibilityState || { selected: isSelected, disabled }
      }
      className={cn(
        "mb-3 w-full flex-row items-center justify-between rounded-3xl border-2 p-4",
        isSelected
          ? "border-interactive-1/30 bg-interactive-2"
          : "border-gray-200 bg-white",
        disabled && "opacity-50",
        className,
      )}
    >
      <Text
        className={cn(
          "text-lg",
          isSelected ? "font-medium text-interactive-1" : "text-gray-900",
          disabled && "opacity-50",
        )}
      >
        {label}
      </Text>
      {rightIcon && (
        <Text
          className={cn(
            "text-xl",
            isSelected && "text-interactive-1",
            disabled && "opacity-50",
          )}
        >
          {rightIcon}
        </Text>
      )}
    </Pressable>
  );
}
