import React, { useCallback, useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import { BlurView } from "expo-blur";
import { usePathname } from "expo-router";

import type { ActiveToast } from "./ToastProvider";

interface ToastProps {
  toast: ActiveToast;
  onDismiss: () => void;
}

const DEFAULT_DURATION = 4000;

export function Toast({ toast, onDismiss }: ToastProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const translateY = useSharedValue(120);
  const opacity = useSharedValue(0);
  const pathnameAtMountRef = useRef(pathname);
  const pathnameLatestRef = useRef(pathname);
  pathnameLatestRef.current = pathname;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runDismissRef = useRef<() => void>(() => {
    // placeholder; replaced in effect below
  });

  const duration = toast.duration ?? DEFAULT_DURATION;
  const variant = toast.variant ?? "success";

  const runDismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    translateY.value = withTiming(120, { duration: 180 });
    opacity.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    });
  }, [onDismiss, translateY, opacity]);

  useEffect(() => {
    runDismissRef.current = runDismiss;
  }, [runDismiss]);

  useEffect(() => {
    pathnameAtMountRef.current = pathnameLatestRef.current;
    // eslint-disable-next-line react-compiler/react-compiler -- reanimated SharedValue mutation; runs on UI thread.
    translateY.value = withTiming(0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(1, { duration: 180 });

    AccessibilityInfo.announceForAccessibility(toast.message);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      runDismissRef.current();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, toast.message, duration, translateY, opacity]);

  useEffect(() => {
    if (pathname !== pathnameAtMountRef.current) {
      runDismissRef.current();
    }
  }, [pathname]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        runDismissRef.current();
      }
    });
    return () => sub.remove();
  }, []);

  const swipeGesture = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 40) {
        runOnJS(runDismiss)();
      } else {
        translateY.value = withTiming(0, {
          duration: 180,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const checkColor = variant === "success" ? "#34C759" : "#FF3B30";

  const handleActionPress = () => {
    toast.action?.onPress();
    runDismiss();
  };

  return (
    <FullWindowOverlay>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrapper,
            { bottom: insets.bottom + 72 },
            containerStyle,
          ]}
        >
          <GestureDetector gesture={swipeGesture}>
            <View style={styles.shadowHost}>
              <View style={styles.clipHost}>
                <BlurView intensity={60} tint="light" style={styles.blur}>
                  <View style={[styles.check, { backgroundColor: checkColor }]}>
                    <Text style={styles.checkGlyph}>
                      {variant === "success" ? "✓" : "✕"}
                    </Text>
                  </View>
                  <Text style={styles.message} numberOfLines={2}>
                    {toast.message}
                  </Text>
                  {toast.action && (
                    <Pressable
                      onPress={handleActionPress}
                      accessibilityRole="button"
                      accessibilityLabel={toast.action.label}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.actionLabel}>
                        {toast.action.label}
                      </Text>
                    </Pressable>
                  )}
                </BlurView>
              </View>
            </View>
          </GestureDetector>
        </Animated.View>
      </View>
    </FullWindowOverlay>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 9999,
  },
  shadowHost: {
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 6,
    backgroundColor: "rgba(242, 242, 247, 0.92)",
  },
  clipHost: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
  },
  blur: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  checkGlyph: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  message: {
    flex: 1,
    fontSize: 13,
    color: "#1C1C1E",
    fontWeight: "500",
    letterSpacing: -0.13,
  },
  actionLabel: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "600",
    letterSpacing: -0.13,
  },
});
