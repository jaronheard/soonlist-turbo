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
import { recentPhotosQueryKey, useRecentPhotos } from "~/hooks/useMediaLibrary";
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

// Define PhotoAsset interface locally (ideally, export from useMediaLibrary.ts and import)
interface PhotoAsset {
  id: string;
  uri: string;
}

/**
 * AddEventButton
 * ---------------
 * Navigates to the /add screen.
 * Optimistically loads the most recent photo from cache for an instant preview.
 * Then, fetches the absolute latest in the background to update if necessary.
 */
export default function AddEventButton({
  showChevron = true,
}: AddEventButtonProps) {
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

  useMediaPermissions();

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

  const handlePress = useCallback(async () => {
    if (!hasUnlimited) {
      await showProPaywallIfNeeded();
      return;
    }

    resetAddEventState(); // Clear previous state first

    // Optimistically set image from cache for instant preview
    try {
      // The query key used in useRecentPhotos for the initial load
      const initialQueryKey = [...recentPhotosQueryKey, { after: undefined }];
      const cachedData = queryClient.getQueryData<{
        photos: PhotoAsset[];
        hasNextPage: boolean;
        endCursor?: string;
      }>(initialQueryKey);

      if (cachedData?.photos[0]?.uri) {
        const optimisticUri = cachedData.photos[0].uri;
        setImagePreview(optimisticUri, "add");
        const filename = optimisticUri.split("/").pop() || "photo.jpg";
        setInput(filename, "add");
        logDebug(
          `[AddEventButton] Optimistically set photo ${optimisticUri} from cache`,
        );
      }
    } catch (e) {
      logError(
        "[AddEventButton] Error reading from query cache for optimistic set",
        e,
      );
    }

    router.push("/add"); // Navigate immediately

    // Heavy work in background: fetch fresh data and update if needed
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
          const { data: photoFetchResult, isSuccess } =
            await refetchRecentPhotos();

          if (
            isSuccess &&
            photoFetchResult &&
            Array.isArray(photoFetchResult.photos) &&
            photoFetchResult.photos.length > 0 &&
            photoFetchResult.photos[0]?.uri
          ) {
            const actualLatestUri = photoFetchResult.photos[0].uri;
            setImagePreview(actualLatestUri, "add"); // Update/confirm the preview
            const filename = actualLatestUri.split("/").pop() || "photo.jpg";
            setInput(filename, "add");
            logDebug(
              `[AddEventButton] Background fetch updated/confirmed photo ${actualLatestUri}`,
            );
          } else {
            logDebug(
              "[AddEventButton] Background photo fetch was not successful or no photos found.",
              {
                isSuccess,
                hasPhotoFetchResult: !!photoFetchResult,
                hasPhotosArray: Array.isArray(photoFetchResult?.photos),
                photosLength: photoFetchResult?.photos.length,
              },
            );
          }
        } else {
          logDebug(
            "[AddEventButton] Permission denied – skipping photo refresh",
          );
        }
      } catch (err) {
        logError("Error in AddEventButton background task", err);
      }
    })();
  }, [
    hasUnlimited,
    showProPaywallIfNeeded,
    resetAddEventState,
    queryClient,
    setImagePreview,
    setInput,
    hasMediaPermission,
    refetchRecentPhotos,
    // router is stable, recentPhotosQueryKey is stable
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
