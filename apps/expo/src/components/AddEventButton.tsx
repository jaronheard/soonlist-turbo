import type { GestureResponderEvent } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useColorScheme } from "nativewind";
import { toast } from "sonner-native";

import type { UploadQueueItem } from "../store/useUploadQueueStore";
import { useAppState } from "../hooks/useAppState";
import { useCreateEvent } from "../hooks/useCreateEvent";
import { useUploadQueueUi } from "../hooks/useFeatureFlags";
import { useHaptics } from "../hooks/useHaptics";
import { useImagePicker } from "../hooks/useImagePicker";
import { useLocalNotifications } from "../hooks/useLocalNotifications";
import { colors } from "../lib/colors";
import { cn } from "../lib/utils";
import { useUploadQueueStore } from "../store/useUploadQueueStore";
import { CircularProgress } from "./CircularProgress";
import { InlineBanner } from "./InlineBanner";
import { UploadStatusSheet } from "./UploadStatusSheet";

export function AddEventButton() {
  const { colorScheme } = useColorScheme();
  const { showActionSheetWithOptions } = useActionSheet();
  const { triggerHaptic } = useHaptics();
  const { user } = useUser();
  const isFocused = useIsFocused();
  const { scheduleNotification } = useLocalNotifications();
  const appState = useAppState();
  const [showBanner, setShowBanner] = useState(false);
  const [bannerType, setBannerType] = useState<"success" | "error">("success");
  const [bannerMessage, setBannerMessage] = useState("");
  const [isStatusSheetOpen, setIsStatusSheetOpen] = useState(false);
  const statusSheetRef = useRef<{ snapToIndex: (index: number) => void }>(null);

  // Feature flag for new upload queue UI
  const useUploadQueueUiEnabled = useUploadQueueUi();

  // Legacy toast-based upload state (will be removed when feature flag is removed)
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // New upload queue state
  const {
    queue,
    addToQueue,
    updateItemProgress,
    updateItemStatus,
    getActiveItems,
    getCompletedItems,
    getFailedItems,
    getTotalItems,
    clearCompletedItems,
  } = useUploadQueueStore();

  const activeItems: UploadQueueItem[] = getActiveItems();
  const failedItems: UploadQueueItem[] = getFailedItems();
  const completedItems: UploadQueueItem[] = getCompletedItems();
  const hasActiveUploads = activeItems.length > 0;
  const hasFailedUploads = failedItems.length > 0;
  const hasCompletedUploads = completedItems.length > 0;
  const totalItems = getTotalItems();

  // Calculate overall progress for the progress ring
  const overallProgress =
    queue.reduce(
      (acc: number, item: UploadQueueItem) => acc + (item.progress || 0),
      0,
    ) / Math.max(totalItems, 1);
  // Handle upload completion
  const handleUploadCompletion = useCallback(() => {
    if (hasCompletedUploads) {
      const count = completedItems.length;
      const message =
        count === 1
          ? "1 photo uploaded successfully"
          : `${count} photos uploaded successfully`;

      // If app was in background, send notification
      if (appState.previous === "background") {
        void scheduleNotification({
          title: "Upload Complete",
          body: message,
        });
      } else {
        // Otherwise show in-app banner
        setBannerType("success");
        setBannerMessage(message);
        setShowBanner(true);
        void triggerHaptic("success");
      }

      // Clear completed items after showing notification
      clearCompletedItems();
    }
  }, [
    hasCompletedUploads,
    completedItems.length,
    appState.previous,
    scheduleNotification,
    triggerHaptic,
    clearCompletedItems,
  ]);

  // Handle upload failure notification
  const handleUploadFailure = useCallback(() => {
    if (hasFailedUploads) {
      const count = failedItems.length;
      const message =
        count === 1
          ? "1 photo failed to upload"
          : `${count} photos failed to upload`;

      // Show error banner
      setBannerType("error");
      setBannerMessage(message);
      setShowBanner(true);
    }
  }, [hasFailedUploads, failedItems.length]);

  // Show completion banner when all uploads finish and we have completed items
  useEffect(() => {
    if (
      !hasActiveUploads &&
      hasCompletedUploads &&
      appState.current === "active"
    ) {
      void handleUploadCompletion();
    }
  }, [hasActiveUploads, hasCompletedUploads, handleUploadCompletion, appState]);

  // Handle background/foreground state changes for notifications
  useEffect(() => {
    // When app comes back to foreground and we have completed uploads
    if (
      appState.current === "active" &&
      appState.previous === "background" &&
      hasCompletedUploads &&
      !hasActiveUploads
    ) {
      // Show banner for completed uploads that happened in background
      void handleUploadCompletion();
    }
  }, [hasCompletedUploads, hasActiveUploads, appState, handleUploadCompletion]);

  // Show status sheet when there are failed uploads
  useEffect(() => {
    if (hasFailedUploads && useUploadQueueUiEnabled) {
      void triggerHaptic("error");
      setIsStatusSheetOpen(true);
    }
  }, [hasFailedUploads, useUploadQueueUiEnabled, triggerHaptic]);

  // Image picker hook
  const { pickImage, takePhoto } = useImagePicker();

  // Create event hook with progress callback
  const { createEvent } = useCreateEvent({
    onProgress: (progress: number, queueItemId?: string) => {
      if (useUploadQueueUiEnabled && queueItemId) {
        updateItemProgress(queueItemId, progress);
      } else {
        setUploadProgress(progress);
      }
    },
    onSuccess: (_data: unknown, queueItemId?: string) => {
      if (useUploadQueueUiEnabled && queueItemId) {
        updateItemStatus(queueItemId, "completed");
      } else {
        setIsUploading(false);
        setUploadProgress(0);
        toast.success("Event created successfully!");
      }
    },
    onError: (error: Error, queueItemId?: string) => {
      console.error("Error creating event:", error);

      if (useUploadQueueUiEnabled && queueItemId) {
        updateItemStatus(queueItemId, "failed", error.message);
        void handleUploadFailure();
      } else {
        setIsUploading(false);
        setUploadProgress(0);
        toast.error("Failed to create event");
      }
    },
  });

  // Handle image selection and upload
  const handleImageSelected = useCallback(
    async (imageUri: string) => {
      if (!user?.id || !user.username) {
        toast.error("User information not available. Please try again.");
        console.error("User ID or username is missing.");
        return;
      }

      if (useUploadQueueUiEnabled) {
        // Add to queue and get the queue item ID
        const queueItemId = addToQueue(imageUri);
        void triggerHaptic("light");

        // Start the upload with the queue item ID for tracking
        await createEvent({
          imageUri,
          queueItemId,
          userId: user.id,
          username: user.username,
        });
      } else {
        // Legacy flow
        setIsUploading(true);
        await createEvent({
          imageUri,
          userId: user.id,
          username: user.username,
        });
      }
    },
    [createEvent, addToQueue, useUploadQueueUiEnabled, triggerHaptic, user],
  );

  // Open action sheet to choose image source
  const openActionSheet = useCallback(() => {
    const options = ["Take Photo", "Choose from Library", "Cancel"];
    const cancelButtonIndex = 2;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
      },
      async (buttonIndex?: number) => {
        try {
          if (buttonIndex === 0) {
            const photo = await takePhoto();
            if (photo) {
              await handleImageSelected(photo);
            }
          } else if (buttonIndex === 1) {
            const image = await pickImage();
            if (image) {
              await handleImageSelected(image);
            }
          }
        } catch (error) {
          console.error("Error handling image selection:", error);
        }
      },
    );
  }, [showActionSheetWithOptions, takePhoto, pickImage, handleImageSelected]);

  // Handle button press
  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation();

      if (useUploadQueueUiEnabled && (hasFailedUploads || hasActiveUploads)) {
        // Open status sheet if we have active or failed uploads
        setIsStatusSheetOpen(true);
        void triggerHaptic("light");
      } else {
        // Otherwise open action sheet to add new photo
        openActionSheet();
      }
    },
    [
      openActionSheet,
      useUploadQueueUiEnabled,
      hasFailedUploads,
      hasActiveUploads,
      triggerHaptic,
    ],
  );

  // Don't show the button if not on the main screen
  if (!isFocused) return null;

  return (
    <>
      <View
        className={cn(
          "absolute bottom-0 right-0 z-10 m-4",
          colorScheme === "dark" ? "bg-black" : "bg-white",
        )}
        style={styles.buttonContainer}
      >
        <Pressable
          onPress={handlePress}
          className={cn(
            "items-center justify-center rounded-full",
            colorScheme === "dark" ? "bg-neutral-800" : "bg-neutral-100",
            hasFailedUploads && useUploadQueueUiEnabled
              ? "border-2 border-red-500"
              : "",
          )}
          style={styles.button}
        >
          {useUploadQueueUiEnabled && hasActiveUploads ? (
            // Show progress ring when uploading with new UI
            <CircularProgress
              progress={overallProgress}
              size={60}
              strokeWidth={3}
              color={colors.primary}
            >
              <View className="items-center justify-center">
                <Ionicons
                  name="add"
                  size={30}
                  color={colorScheme === "dark" ? "white" : "black"}
                />
                {totalItems > 1 && (
                  <View
                    className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-primary"
                    style={styles.badge}
                  >
                    <View className="text-xs font-bold text-white">
                      {totalItems}
                    </View>
                  </View>
                )}
              </View>
            </CircularProgress>
          ) : (
            // Regular add button
            <Ionicons
              name="add"
              size={30}
              color={colorScheme === "dark" ? "white" : "black"}
            />
          )}
        </Pressable>
      </View>

      {/* Legacy toast UI */}
      {!useUploadQueueUiEnabled && isUploading && (
        <View className="absolute bottom-24 left-0 right-0 items-center">
          <View className="flex-row items-center rounded-lg bg-neutral-800 px-4 py-2">
            <View className="h-1 w-40 overflow-hidden rounded-full bg-neutral-700">
              <View
                className="h-full bg-primary"
                style={{ width: `${uploadProgress * 100}%` }}
              />
            </View>
            <View className="ml-2">
              <View className="text-xs text-white">
                {Math.round(uploadProgress * 100)}%
              </View>
            </View>
          </View>
        </View>
      )}

      {/* New UI components */}
      {useUploadQueueUiEnabled && (
        <>
          <UploadStatusSheet
            isOpen={isStatusSheetOpen}
            onClose={() => setIsStatusSheetOpen(false)}
            ref={statusSheetRef}
          />
          <InlineBanner
            visible={showBanner}
            message={bannerMessage}
            type={bannerType}
            onDismiss={() => setShowBanner(false)}
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  button: {
    width: 60,
    height: 60,
  },
  badge: {
    borderWidth: 1,
    borderColor: "white",
  },
});
