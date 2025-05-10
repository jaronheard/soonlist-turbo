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
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { toast } from "sonner-native";

import { ChevronDown, PlusIcon, Sparkles } from "~/components/icons";
import { useCreateEvent } from "~/hooks/useCreateEvent";
import { useMediaPermissions } from "~/hooks/useMediaPermissions";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { logError } from "../utils/errorLogging";

interface AddEventButtonProps {
  showChevron?: boolean;
}

/**
 * AddEventButton
 * ---------------
 * Opens the native photo picker (up to 10 images) and creates events for each selected photo in parallel.
 * This bypasses the /add screen for a faster multi‑event creation flow.
 */
export default function AddEventButton({
  showChevron = true,
}: AddEventButtonProps) {
  // Zustand selectors
  const { resetAddEventState } = useAppStore((state) => ({
    resetAddEventState: state.resetAddEventState,
  }));

  const { customerInfo, showProPaywallIfNeeded, isLoading } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  const { user } = useUser();
  const { createEvent } = useCreateEvent();

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
   * 2. Clear draft state (so any stale data is removed)
   * 3. Launch native photo picker directly
   * 4. Create event with selected photo
   * 5. Show success toast
   */
  const handlePress = useCallback(async () => {
    // 1. Paywall gate
    if (!hasUnlimited) {
      void showProPaywallIfNeeded();
      return;
    }

    // 2. Clear draft state
    resetAddEventState();

    // 3. Launch native photo picker directly
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 10, // iOS‑only; we also enforce in JS
      });

      if (!result.canceled && result.assets.length) {
        // Ensure user info is available before proceeding
        if (!user?.id || !user.username) {
          toast.error("User information not available");
          return;
        }

        // Respect the 10‑image limit in case the platform ignores selectionLimit
        const assets = result.assets.slice(0, 10);

        // Show a persistent loading toast with the number of events being captured
        const loadingToastId = toast.loading(
          assets.length > 1
            ? `Capturing ${assets.length} events…`
            : "Capturing event…",
          { duration: Infinity },
        );

        // Kick off event creation requests in parallel
        const creationResults = await Promise.allSettled(
          assets.map((asset) =>
            createEvent({
              imageUri: asset.uri,
              userId: user.id,
              username: user.username!,
            }),
          ),
        );

        // Loading finished — remove spinner
        toast.dismiss(loadingToastId);

        // Gather successes
        const successfulIds = creationResults
          .filter(
            (r): r is PromiseFulfilledResult<string | undefined> =>
              r.status === "fulfilled" && typeof r.value === "string",
          )
          .map((r) => r.value);

        const failedCount = assets.length - successfulIds.length;

        // Aggregate feedback
        if (successfulIds.length === 1) {
          toast.success("Captured successfully!", {
            action: {
              label: "View event",
              onClick: () => {
                toast.dismiss();
                router.push(`/event/${successfulIds[0]}`);
              },
            },
          });
        } else if (successfulIds.length > 1) {
          toast.success(
            `Captured ${successfulIds.length} events successfully!`,
            {
              action: {
                label: "View events",
                onClick: () => {
                  toast.dismiss();
                  router.push("/feed");
                },
              },
            },
          );
        }

        if (failedCount > 0) {
          toast.error(
            `Failed to create ${failedCount} event${
              failedCount > 1 ? "s" : ""
            }. Please try again.`,
          );
        }
      }
    } catch (err) {
      logError("Error in AddEventButton handlePress", err);
      toast.error("Failed to open photo picker. Please try again.");
    }
  }, [
    hasUnlimited,
    showProPaywallIfNeeded,
    resetAddEventState,
    user,
    createEvent,
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
