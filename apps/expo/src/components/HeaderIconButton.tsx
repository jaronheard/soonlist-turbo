import type { Href } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";
import { router } from "expo-router";

import { X } from "~/components/icons";

// iOS 26 Liquid Glass headers wrap nav-bar items in their own shared
// backdrop capsule, so we don't paint our own background/shadow here —
// just give the icon a 36pt centered hit area to match SF-Symbol sizing.
const HEADER_ICON_BUTTON_STYLE = {
  width: 36,
  height: 36,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const HEADER_BUTTON_HIT_SLOP = {
  top: 8,
  bottom: 8,
  left: 8,
  right: 8,
};

interface HeaderIconButtonProps {
  onPress?: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
  style?: React.ComponentProps<typeof TouchableOpacity>["style"];
}

export function HeaderIconButton({
  onPress,
  accessibilityLabel,
  children,
  disabled,
  style,
}: HeaderIconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={HEADER_BUTTON_HIT_SLOP}
      activeOpacity={0.6}
      style={[
        HEADER_ICON_BUTTON_STYLE,
        disabled ? { opacity: 0.4 } : null,
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}

interface HeaderCloseButtonProps {
  // Accept undefined so callers can forward React Navigation's
  // `headerLeft: ({ tintColor }) => ...` arg directly. When unset, falls
  // back to the screen's `headerTintColor` value (purple by default).
  tintColor?: string;
  fallbackHref?: Href;
  accessibilityLabel?: string;
}

export function HeaderCloseButton({
  tintColor,
  fallbackHref = "/feed",
  accessibilityLabel = "Close",
}: HeaderCloseButtonProps) {
  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackHref);
    }
  };

  return (
    <HeaderIconButton
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
    >
      <X size={18} color={tintColor ?? "#5A32FB"} strokeWidth={2.5} />
    </HeaderIconButton>
  );
}
