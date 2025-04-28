import React, { useCallback, useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { ChevronDown, PlusIcon, Sparkles } from "~/components/icons";
import { useRecentPhotos } from "~/hooks/useMediaLibrary";
import {
  mediaPermissionsQueryKey,
  useMediaPermissions,
} from "~/hooks/useMediaPermissions";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { logDebug, logError } from "../utils/errorLogging";

interface AddEventButtonProps {
  showChevron?: boolean;
}

/**
 * AddEventButton
 * ---------------
 * Navigates to the /add screen and preloads the most recent photo.
 * The navigation happens instantly; media‑library work is done afterwards
 * so the screen transition feels snappy.
 */
export default function AddEventButton({
  showChevron = true,
}: AddEventButtonProps) {
  // Zustand selectors
  const { resetAddEventState, setImagePreview, setInput, hasMediaPermission } =
    useAppStore((state) => ({
      resetAddEventState: state.resetAddEventState,
      setImagePreview: state.setImagePreview,
      setInput: state.setInput,
      hasMediaPermission: state.hasMediaPermission,
    }));

  const { customerInfo, showProPaywallIfNeeded, isLoading } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  const queryClient = useQueryClient();
  const { refetch: refetchRecentPhotos } = useRecentPhotos();

  // Keep permission status up‑to‑date globally
  useMediaPermissions();

  /**
   * Small bounce for the chevron hint
   */
  const translateY = useSharedValue(0);
  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(-12, { duration: 500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      translateY.value = 0;
    };
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: -150,
    left: "50%",
    transform: [{ translateX: -32 }, { translateY: translateY.value }],
    zIndex: 10,
  }));

  /**
   * Main press handler
   * ------------------
   * 1. Show paywall if needed.
   * 2. Reset any previous draft.
   * 3. Navigate immediately.
   * 4. In the background: ensure permission → refresh photos → select latest.
   */
  const handlePress = useCallback(async () => {
    // 1. Paywall gate
    if (!hasUnlimited) {
      await showProPaywallIfNeeded();
      return;
    }

    // 2. Clear draft state (so /add opens fresh)
    resetAddEventState();

    // 3. Navigate right away for instant feedback
    router.push("/add");

    // 4. Heavy work in background (don’t block UI)
    void (async () => {
      try {
        let permissionGranted = hasMediaPermission;

        if (!permissionGranted) {
          logDebug("[AddEventButton] Requesting media permission …");
          const permissionResponse =
            await MediaLibrary.requestPermissionsAsync();
          permissionGranted =
            permissionResponse.status ===
              MediaLibrary.PermissionStatus.GRANTED ||
            permissionResponse.accessPrivileges === "limited";

          if (permissionGranted) {
            await queryClient.invalidateQueries({
              queryKey: mediaPermissionsQueryKey,
            });
          }
        }

        if (permissionGranted) {
          const { data: photos, isSuccess } = await refetchRecentPhotos();
          if (isSuccess && photos?.[0]?.uri) {
            const uri = photos[0].uri;
            setImagePreview(uri, "add");
            const filename = uri.split("/").pop() || "photo.jpg";
            setInput(filename, "add");
            logDebug(`[AddEventButton] Selected latest photo ${uri}`);
          }
        } else {
          logDebug(
            "[AddEventButton] Permission denied – skipping photo refresh",
          );
        }
      } catch (err) {
        logError("Error in AddEventButton handlePress", err);
      }
    })();
  }, [
    hasUnlimited,
    showProPaywallIfNeeded,
    resetAddEventState,
    hasMediaPermission,
    queryClient,
    refetchRecentPhotos,
    setImagePreview,
    setInput,
  ]);

  /**
   * UI
   */
  return (
    <>
      {/* Background gradients */}
      <View className="absolute bottom-0 left-0 right-0" pointerEvents="none">
        <View className="absolute bottom-0 h-24 w-full">
          <BlurView
            intensity={10}
            className="h-full w-full opacity-20"
            tint="light"
          />
        </View>
        <View className="absolute bottom-0 h-40 w-full">
          <LinearGradient
            colors={["transparent", "#5A32FB"]}
            locations={[0, 1]}
            style={{
              position: "absolute",
              height: "100%",
              width: "100%",
              opacity: 0.3,
            }}
          />
          <LinearGradient
            colors={["transparent", "#E0D9FF"]}
            locations={[0, 1]}
            style={{
              position: "absolute",
              height: "100%",
              width: "100%",
              opacity: 0.1,
            }}
          />
        </View>
      </View>

      {/* Main action button */}
      {!isLoading && (
        <TouchableOpacity
          onPress={handlePress}
          className="absolute bottom-8 self-center"
        >
          {hasUnlimited ? (
            <View
              className="relative flex-row items-center justify-center gap-2 rounded-full bg-interactive-1 p-3"
              style={{
                shadowColor: "#5A32FB",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 8,
              }}
            >
              <PlusIcon size={44} color="#FFF" strokeWidth={2} />
            </View>
          ) : (
            <View
              className="flex-row items-center justify-center rounded-full bg-interactive-1 px-3 py-3.5"
              style={{
                shadowColor: "#5A32FB",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 8,
              }}
            >
              <Sparkles size={20} color="#FFF" />
              <Text className="ml-2 text-2xl font-bold text-white">
                Start your free trial
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Bouncing chevron */}
      {showChevron && (
        <Animated.View style={animatedStyle}>
          <ChevronDown size={64} color="#5A32FB" strokeWidth={4} />
        </Animated.View>
      )}
    </>
  );
}
