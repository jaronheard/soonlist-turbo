import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlusIcon } from "~/components/icons";
import { useAddEventFlow } from "~/hooks/useAddEventFlow";
import { SUPPORTS_LIQUID_GLASS } from "~/hooks/useLiquidGlass";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";

interface CaptureOverlayButtonProps {
  /** Distance from the bottom of the containing layout. */
  bottomOffset?: number;
  /** Distance from the right edge of the screen. */
  rightOffset?: number;
}

const BUTTON_SIZE = 56;

// Safety timeout to recover from stuck isCapturing state (e.g. unhandled edge cases)
const CAPTURING_TIMEOUT_MS = 30_000;

/**
 * CaptureOverlayButton
 * ---------------------
 * Floating capture entry point rendered inside the tab screen layouts (feed
 * and following). Positioned relative to the tab content area.
 *
 * Before iOS 26, bottom inset includes the safe area so the control clears the
 * home indicator; on iOS 26 and later, positioning matches the original floating layout.
 *
 * iOS-only — the app does not ship Android.
 */
export function CaptureOverlayButton({
  bottomOffset = 24,
  rightOffset = 16,
}: CaptureOverlayButtonProps = {}) {
  const insets = useSafeAreaInsets();
  const isOnline = useNetworkStatus();
  const isCapturing = useInFlightEventStore((s) => s.isCapturing);
  const { triggerAddEventFlow } = useAddEventFlow();

  // Safety timeout: reset isCapturing if it gets stuck for 30s.
  // This prevents permanent frozen state from any unhandled edge case.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isCapturing) {
      timeoutRef.current = setTimeout(() => {
        useInFlightEventStore.getState().setIsCapturing(false);
      }, CAPTURING_TIMEOUT_MS);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isCapturing]);

  // Platform gate — Android is not a supported platform on this project.
  if (Platform.OS !== "ios") return null;

  const handlePress = () => void triggerAddEventFlow();

  const accessibilityLabel = isOnline
    ? "Capture event from photos"
    : "Capture event from photos (offline)";

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        right: rightOffset,
        bottom: bottomOffset + (SUPPORTS_LIQUID_GLASS ? 0 : insets.bottom),
        zIndex: 100,
      }}
    >
      <Pressable
        onPress={handlePress}
        disabled={!isOnline || isCapturing}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Opens photo picker to create an event"
        accessibilityState={{
          disabled: !isOnline || isCapturing,
          busy: isCapturing,
        }}
        style={({ pressed }) => ({
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          alignItems: "center",
          justifyContent: "center",
          opacity: !isOnline ? 0.4 : pressed ? 0.6 : 1,
        })}
      >
        <View
          style={{
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            borderRadius: BUTTON_SIZE / 2,
            backgroundColor: "#5A32FB",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isCapturing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <PlusIcon size={28} color="#FFF" strokeWidth={2.5} />
          )}
        </View>
      </Pressable>
    </View>
  );
}
