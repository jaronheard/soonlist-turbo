import React from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

import { Check, PlusIcon } from "~/components/icons";
import { hapticLight } from "~/utils/feedback";

interface SubscribeButtonProps {
  isSubscribed: boolean;
  onPress: () => void;
  /** "md" = header pill; "sm" = row pill (tighter, smaller text). Defaults to "md". */
  size?: "sm" | "md";
  /** Override the default a11y label. */
  accessibilityLabel?: string;
  /** When true, shows a spinner in place of the icon + label and blocks taps. */
  loading?: boolean;
}

export function SubscribeButton({
  isSubscribed,
  onPress,
  size = "md",
  accessibilityLabel,
  loading = false,
}: SubscribeButtonProps) {
  const containerSize = size === "sm" ? "px-3 py-1" : "px-4 py-1.5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const iconSize = size === "sm" ? 12 : 14;
  const iconColor = isSubscribed ? "#5A32FB" : "#FFFFFF";
  const Icon = isSubscribed ? Check : PlusIcon;

  return (
    <TouchableOpacity
      disabled={loading}
      onPress={() => {
        if (loading) return;
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
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isSubscribed ? "#5A32FB" : "#FFFFFF"}
        />
      ) : (
        <>
          <Icon size={iconSize} color={iconColor} strokeWidth={2.5} />
          <Text
            className={`${textSize} font-semibold ${
              isSubscribed ? "text-interactive-1" : "text-white"
            }`}
          >
            {isSubscribed ? "Subscribed" : "Subscribe"}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
