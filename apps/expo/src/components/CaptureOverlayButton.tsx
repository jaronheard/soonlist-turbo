import React, { useEffect, useRef } from "react";
import { Image, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CircularSpinner } from "~/components/ui/CircularSpinner";
import { useAddEventFlow } from "~/hooks/useAddEventFlow";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";

interface CaptureOverlayButtonProps {
  /** Distance above the safe-area bottom inset. Tunable empirically. */
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
 * Floating capture entry point rendered inside the tab layout, sitting above
 * the native tab bar. Modals present over the tab layout so this button is
 * naturally covered during modal presentations — no pathname gating needed.
 *
 * iOS-only — the app does not ship Android.
 */
export function CaptureOverlayButton({
  bottomOffset = -10,
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
        bottom: bottomOffset + insets.bottom,
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
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-assertions
          source={require("../assets/capture-tab.png") as number}
          style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
          resizeMode="contain"
        />
        {isCapturing && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              width: BUTTON_SIZE,
              height: BUTTON_SIZE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularSpinner
              size={BUTTON_SIZE}
              strokeWidth={3}
              color="#5A32FB"
            />
          </View>
        )}
      </Pressable>
    </View>
  );
}
