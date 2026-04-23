import React from "react";
import { Text, TouchableOpacity } from "react-native";

import { Check, PlusIcon } from "~/components/icons";
import { hapticLight } from "~/utils/feedback";

interface SubscribeButtonProps {
  isSubscribed: boolean;
  onPress: () => void;
  size?: "sm" | "md";
  accessibilityLabel?: string;
}

export function SubscribeButton({
  isSubscribed,
  onPress,
  size = "md",
  accessibilityLabel,
}: SubscribeButtonProps) {
  const containerSize = size === "sm" ? "px-3 py-1" : "px-4 py-1.5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const iconSize = size === "sm" ? 12 : 14;
  const iconColor = isSubscribed ? "#5A32FB" : "#FFFFFF";
  const Icon = isSubscribed ? Check : PlusIcon;

  return (
    <TouchableOpacity
      onPress={() => {
        void hapticLight();
        onPress();
      }}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ??
        (isSubscribed ? "Subscribed to list" : "Subscribe to list")
      }
      className={`flex-row items-center gap-1 rounded-full ${containerSize} ${
        isSubscribed ? "bg-interactive-2" : "bg-interactive-1"
      }`}
    >
      <Icon size={iconSize} color={iconColor} strokeWidth={2.5} />
      <Text
        className={`${textSize} font-semibold ${
          isSubscribed ? "text-interactive-1" : "text-white"
        }`}
      >
        {isSubscribed ? "Subscribed" : "Subscribe"}
      </Text>
    </TouchableOpacity>
  );
}
