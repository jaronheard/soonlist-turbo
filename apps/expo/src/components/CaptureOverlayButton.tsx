import React, { useEffect, useRef } from "react";
import { Image, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname } from "expo-router";

import { CircularSpinner } from "~/components/ui/CircularSpinner";
import { useAddEventFlow } from "~/hooks/useAddEventFlow";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";

interface CaptureOverlayButtonProps {
  /** Override pathname for visibility gating. Defaults to usePathname(). */
  pathname?: string;
  /** Distance above the safe-area bottom inset. Tunable empirically. */
  bottomOffset?: number;
  /** Distance from the right edge of the screen. */
  rightOffset?: number;
}

// Routes where the overlay should be visible. Includes nested routes via
// prefix match. Any other pathname (modals, auth, onboarding, settings,
// profiles, event details, paywall, etc.) hides the overlay by construction.
const TAB_PATH_ALLOWLIST = ["/feed", "/following", "/discover"] as const;

const BUTTON_SIZE = 56;

/**
 * CaptureOverlayButton
 * ---------------------
 * Floating capture entry point rendered at the root layout, sitting above
 * the native tab bar. Replaces the old `NativeTabs.Trigger name="add"
 * role="search"` tab, which navigated to a blank placeholder screen.
 *
 * Visibility is gated to the main tab routes (feed, following, discover) so
 * the overlay hides automatically during modal presentations (event details,
 * profiles, settings, paywall, onboarding, etc.).
 *
 * iOS-only — the app does not ship Android.
 */
export function CaptureOverlayButton({
  pathname: pathnameProp,
  bottomOffset = -10,
  rightOffset = 16,
}: CaptureOverlayButtonProps = {}) {
  const currentPathname = usePathname();
  const insets = useSafeAreaInsets();
  const isOnline = useNetworkStatus();
  const isCapturing = useInFlightEventStore((s) => s.isCapturing);
  const { triggerAddEventFlow } = useAddEventFlow();

  // Synchronous guard that closes the ~20ms race window between a tap
  // firing and `setIsCapturing(true)` flushing through the store. The old
  // `pickerActiveRef` in `(tabs)/_layout.tsx` did this same thing before
  // this refactor. Reset when `isCapturing` falls back to false, which
  // useAddEventFlow guarantees on cancel, success, and error.
  const pressLockRef = useRef(false);
  useEffect(() => {
    if (!isCapturing) {
      pressLockRef.current = false;
    }
  }, [isCapturing]);

  const pathname = pathnameProp ?? currentPathname;

  // Platform gate — Android is not a supported platform on this project.
  if (Platform.OS !== "ios") return null;

  // Path gate — show only on the main tab routes and their nested routes.
  const isOnTabRoute = TAB_PATH_ALLOWLIST.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isOnTabRoute) return null;

  const handlePress = () => {
    // Two-layer double-tap guard:
    // 1. `pressLockRef` closes the ~20ms window between the first tap and
    //    `setIsCapturing(true)` becoming visible (useAddEventFlow awaits
    //    `Haptics.selectionAsync()` before setting the store, so a rapid
    //    second tap would otherwise see `isCapturing=false`).
    // 2. `isCapturing` store read also blocks captures in flight from
    //    other call sites like UserEventsList's empty-state CTAs.
    if (pressLockRef.current || isCapturing) return;
    pressLockRef.current = true;
    void triggerAddEventFlow();
  };

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
