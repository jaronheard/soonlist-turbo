import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlusIcon } from "~/components/icons";
import { useAddEventFlow } from "~/hooks/useAddEventFlow";
import { SUPPORTS_LIQUID_GLASS } from "~/hooks/useLiquidGlass";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";

interface CaptureOverlayButtonProps {
  bottomOffset?: number;
  rightOffset?: number;
}

const BUTTON_SIZE = 56;

const CAPTURING_TIMEOUT_MS = 30_000;

export function CaptureOverlayButton({
  bottomOffset = 24,
  rightOffset = 16,
}: CaptureOverlayButtonProps = {}) {
  const insets = useSafeAreaInsets();
  const isOnline = useNetworkStatus();
  const isCapturing = useInFlightEventStore((s) => s.isCapturing);
  const { triggerAddEventFlow } = useAddEventFlow();

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
