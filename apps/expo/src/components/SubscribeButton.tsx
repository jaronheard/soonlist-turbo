import React from "react";
import { Text, TouchableOpacity } from "react-native";

import { Check, PlusIcon } from "~/components/icons";
import { hapticMedium } from "~/utils/feedback";

interface SubscribeButtonProps {
  isSubscribed: boolean;
  onPress: () => void;
  /** "md" = header pill; "sm" = row pill (tighter, smaller text). Defaults to "md". */
  size?: "sm" | "md";
  /** Override the default a11y label. */
  accessibilityLabel?: string;
}

export function SubscribeButton({
  isSubscribed,
  onPress,
  size = "md",
  accessibilityLabel,
}: SubscribeButtonProps) {
  const containerSize = size === "sm" ? "px-3.5 py-1.5" : "px-5 py-2";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const iconSize = size === "sm" ? 14 : 16;
  const iconColor = isSubscribed ? "#5A32FB" : "#FFFFFF";
  const Icon = isSubscribed ? Check : PlusIcon;

  return (
    <TouchableOpacity
      onPress={() => {
        // On the unsubscribe path we fire a synchronous Medium haptic since
        // no follow-up success haptic is queued. On the subscribe path the
        // parent handler's resolved-promise fires hapticSuccess instead, so
        // we stay silent here to avoid a double-buzz.
        if (isSubscribed) {
          void hapticMedium();
        }
        onPress();
      }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ??
        (isSubscribed ? "Subscribed to list" : "Subscribe to list")
      }
      style={
        isSubscribed
          ? undefined
          : {
              shadowColor: "#5A32FB",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
            }
      }
      className={`flex-row items-center gap-1.5 rounded-full ${containerSize} ${
        isSubscribed ? "bg-interactive-2" : "bg-interactive-1"
      }`}
    >
      <Icon size={iconSize} color={iconColor} strokeWidth={2.75} />
      <Text
        className={`${textSize} font-bold ${
          isSubscribed ? "text-interactive-1" : "text-white"
        }`}
      >
        {isSubscribed ? "Subscribed" : "Subscribe"}
      </Text>
    </TouchableOpacity>
  );
}
