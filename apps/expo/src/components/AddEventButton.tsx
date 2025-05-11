import React, { useCallback, useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { toast } from "sonner-native";
import Svg, { Circle } from "react-native-svg";

import { ChevronDown, PlusIcon, Sparkles } from "~/components/icons";
import { useCreateEvent } from "~/hooks/useCreateEvent";
import { useMediaPermissions } from "~/hooks/useMediaPermissions";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { useQueueCounts, useOverallProgress, useUploadQueueStore } from "~/store/useUploadQueueStore";
import { logError } from "../utils/errorLogging";
import { openUploadStatusSheet } from "./UploadStatusSheet";
import { showInlineBanner } from "./InlineBanner";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

  // Queue state
  const { total, failed } = useQueueCounts();
  const progress = useOverallProgress();
  const [wasBusy, setWasBusy] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [lastId, setLastId] = useState<string | undefined>(undefined);

  // Calculate circumference for progress ring
  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  // Watch for queue completion
  useEffect(() => {
    if (total > 0) setWasBusy(true);
    
    if (wasBusy && total === 0) {
      setWasBusy(false);
      
      // Count successful items before clearing them
      const items = useUploadQueueStore.getState().items;
      const successfulItems = items.filter(item => item.status === "success");
      const count = successfulItems.length;
      
      // Get the last successful event ID for single-event navigation
      const lastSuccessfulItem = successfulItems[successfulItems.length - 1];
      const lastEventId = lastSuccessfulItem?.eventId;
      
      setSuccessCount(count);
      setLastId(lastEventId);
      
      if (failed > 0) {
        // Show failure banner
        showInlineBanner(
          `${failed} event${failed > 1 ? "s" : ""} failed · Retry`,
          () => openUploadStatusSheet(),
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (count > 0) {
        // Show success banner
        showInlineBanner(
          `${count} event${count > 1 ? "s" : ""} added`,
          () => router.push(count === 1 && lastEventId ? `/event/${lastEventId}` : "/feed"),
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Clear successful items so badge stays hidden
      useUploadQueueStore.getState().clearCompleted();
    }
  }, [total, failed, wasBusy]);

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

  // Animated props for progress ring
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress),
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
    // Haptic feedback on tap
    Haptics.selectionAsync();

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 10, // iOS‑only; we also enforce in JS
      });

      if (!result.canceled && result.assets.length) {
        const username = user?.username;
        const userId = user?.id;

        // Ensure user info is available before proceeding
        if (!username || !userId) {
          toast.error("User information not available");
          return;
        }

        // Respect the 10‑image limit in case the platform ignores selectionLimit
        const assets = result.assets.slice(0, 10);
        
        // Add assets to queue
        const assetUris = assets.map(asset => asset.uri);
        useUploadQueueStore.getState().enqueue(assetUris);
        
        // Get the queue items for these assets
        const queueItems = useUploadQueueStore.getState().items
          .filter(item => assetUris.includes(item.assetUri));

        // Kick off event creation requests in parallel
        void Promise.allSettled(
          queueItems.map((item) =>
            createEvent({
              imageUri: item.assetUri,
              userId: userId,
              username: username,
              queueItemId: item.id,
            }),
          ),
        );
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

  // Handle badge tap
  const handleBadgeTap = useCallback((e: any) => {
    e.stopPropagation();
    openUploadStatusSheet();
  }, []);

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
              {/* Progress ring */}
              <Svg width={96} height={96} style={{ position: 'absolute' }}>
                <AnimatedCircle
                  cx={48}
                  cy={48}
                  r={radius}
                  stroke={failed ? "#FF4444" : "#5A32FB"}
                  strokeWidth={4}
                  strokeDasharray={circumference}
                  animatedProps={animatedProps}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </Svg>
              
              {/* "+" icon stays centered */}
              <PlusIcon size={44} color="#FFF" strokeWidth={2} />
              
              {/* Badge */}
              {total > 0 && (
                <TouchableOpacity
                  onPress={handleBadgeTap}
                  className="absolute right-0 top-0 h-6 min-w-6 rounded-full bg-white px-1"
                  style={{
                    backgroundColor: failed ? "#FF4444" : "white",
                  }}
                >
                  <Text 
                    className="text-center text-xs font-bold"
                    style={{
                      color: failed ? "white" : "black",
                    }}
                  >
                    {failed ? "⚠️" : total}
                  </Text>
                </TouchableOpacity>
              )}
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
