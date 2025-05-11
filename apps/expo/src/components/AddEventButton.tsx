/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, GestureResponderEvent } from "react-native";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { useUploadQueueStore } from "../store/useUploadQueueStore";
import { useUploadQueueUi } from "../hooks/useFeatureFlags";
import { UploadStatusSheet } from "./UploadStatusSheet";
import { InlineBanner } from "./InlineBanner";
import { CircularProgress } from "./CircularProgress";
import { useCreateEvent, CreateEventOptions } from "../hooks/useCreateEvent";
import { useImagePicker } from "../hooks/useImagePicker";
import { useAppState } from "../hooks/useAppState";
import { useLocalNotifications } from "../hooks/useLocalNotifications";
import { useHaptics } from "../hooks/useHaptics";
import { useToast } from "../hooks/useToast";
import { cn } from "../lib/utils";
import { colors } from "../lib/colors";

interface AddEventButtonProps {
  showChevron?: boolean;
}

export function AddEventButton({ showChevron }: AddEventButtonProps = {}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const { showActionSheetWithOptions } = useActionSheet();
  const { showToast } = useToast();
  const { triggerHaptic } = useHaptics();
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
    removeFromQueue,
    retryItem,
    getActiveItems,
    getCompletedItems,
    getFailedItems,
    getTotalItems,
    clearCompletedItems,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    successCount,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    lastId,
  } = useUploadQueueStore();

  const activeItems = getActiveItems();
  const failedItems = getFailedItems();
  const completedItems = getCompletedItems();
  const hasActiveUploads = activeItems.length > 0;
  const hasFailedUploads = failedItems.length > 0;
  const hasCompletedUploads = completedItems.length > 0;
  const totalItems = getTotalItems();

  // Calculate overall progress for the progress ring
  const overallProgress =
    queue.reduce((acc: number, item: any) => acc + (item.progress || 0), 0) /
    Math.max(totalItems, 1);

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
  }, [appState.current, hasCompletedUploads, hasActiveUploads]);

  // Show status sheet when there are failed uploads
  useEffect(() => {
    if (hasFailedUploads && useUploadQueueUiEnabled) {
      void triggerHaptic("error");
      setIsStatusSheetOpen(true);
    }
  }, [hasFailedUploads, useUploadQueueUiEnabled, triggerHaptic]);

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
  }, [
    hasActiveUploads,
    hasCompletedUploads,
    appState.current,
    handleUploadCompletion,
  ]);

  // Image picker hook
  const { pickImage, takePhoto } = useImagePicker();

  // Create event hook with progress callback
  const { createEvent } = useCreateEvent({
    onProgress: (progress: number, queueItemId: string) => {
      if (useUploadQueueUiEnabled && queueItemId) {
        updateItemProgress(queueItemId, progress);
      } else {
        setUploadProgress(progress);
      }
    },
    onSuccess: (_: any, queueItemId: string) => {
      if (useUploadQueueUiEnabled && queueItemId) {
        updateItemStatus(queueItemId, "completed");
      } else {
        setIsUploading(false);
        setUploadProgress(0);
        showToast({
          message: "Event created successfully!",
          type: "success",
        });
      }
    },
    onError: (error: Error, queueItemId: string) => {
      console.error("Error creating event:", error);

      if (useUploadQueueUiEnabled && queueItemId) {
        updateItemStatus(queueItemId, "failed", error.message);
        void handleUploadFailure();
      } else {
        setIsUploading(false);
        setUploadProgress(0);
        showToast({
          message: "Failed to create event",
          type: "error",
        });
      }
    },
  });

  // Handle image selection and upload
  const handleImageSelected = useCallback(
    async (imageUri: string) => {
      if (useUploadQueueUiEnabled) {
        // Add to queue and get the queue item ID
        const queueItemId = addToQueue(imageUri);
        void triggerHaptic("light");

        // Start the upload with the queue item ID for tracking
        await createEvent({ 
          imageUri, 
          queueItemId,
          userId: "", // Add required properties
          username: ""
        });
      } else {
        // Legacy flow
        setIsUploading(true);
        await createEvent({ 
          imageUri,
          userId: "", // Add required properties
          username: ""
        });
      }
    },
    [createEvent, addToQueue, useUploadQueueUiEnabled, triggerHaptic],
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
      async (buttonIndex: number) => {
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
          "absolute bottom-0 right-0 m-4 z-10",
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
                    className="absolute -top-1 -right-1 bg-primary rounded-full w-5 h-5 items-center justify-center"
                    style={styles.badge}
                  >
                    <View className="text-xs text-white font-bold">
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
          <View className="bg-neutral-800 rounded-lg px-4 py-2 flex-row items-center">
            <View className="w-40 h-1 bg-neutral-700 rounded-full overflow-hidden">
              <View
                className="h-full bg-primary"
                style={{ width: `${uploadProgress * 100}%` }}
              />
            </View>
            <View className="ml-2">
              <View className="text-white text-xs">
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
