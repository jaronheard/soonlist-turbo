import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { useMutation } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useOneSignal } from "~/providers/OneSignalProvider";
import { useAppStore, useUserTimezone } from "~/store";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";
import { logError } from "~/utils/errorLogging";

interface CreateEventOptions {
  imageUri?: string;
  userId: string;
  username: string;
  sendNotification?: boolean;
  suppressCapturing?: boolean;
  // Legacy field for text events (not yet implemented with workflows)
  rawText?: string;
  linkPreview?: string;
}

// Optimize image off the main JS thread and return a base64 string
async function optimizeImage(uri: string): Promise<string> {
  try {
    // Resize & compress on the native thread and get base64 in a single step
    const { base64 } = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 640 } }],
      {
        compress: 0.5,
        format: ImageManipulator.SaveFormat.WEBP,
        base64: true,
      },
    );

    if (!base64) {
      throw new Error("Failed to encode image to base64");
    }

    return base64;
  } catch (error) {
    logError("Error manipulating image", error);
    throw new Error("Failed to optimize image for upload");
  }
}

export function useCreateEvent() {
  const { setIsImageLoading, addWorkflowId } = useAppStore();
  const { setIsCapturing } = useInFlightEventStore();
  const { hasNotificationPermission: _ } = useOneSignal();
  const userTimezone = useUserTimezone();

  const eventFromImageBase64 = useMutation(
    api.ai.eventFromImageBase64ThenCreate,
  );
  const eventFromUrl = useMutation(api.ai.eventFromUrlThenCreate);
  const eventFromText = useMutation(api.ai.eventFromTextThenCreate);

  const createEvent = useCallback(
    async (options: CreateEventOptions): Promise<string> => {
      const {
        imageUri,
        userId,
        username,
        sendNotification = true,
        suppressCapturing = false,
        rawText,
        linkPreview,
      } = options;

      try {
        if (!suppressCapturing) {
          setIsCapturing(true);
        }

        // Check if we have an image to process
        if (imageUri) {
          // Set loading state for both routes since we don't know which one is active
          setIsImageLoading(true, "add");
          setIsImageLoading(true, "new");

          // Convert photo library URI to file URI if needed
          let fileUri = imageUri;
          if (imageUri.startsWith("ph://")) {
            const assetId = imageUri.replace("ph://", "").split("/")[0];
            if (!assetId) {
              throw new Error("Invalid photo library asset ID");
            }
            const asset = await MediaLibrary.getAssetInfoAsync(assetId);
            if (!asset.localUri) {
              throw new Error(
                "Could not get local URI for photo library asset",
              );
            }
            fileUri = asset.localUri;
          }

          // Validate image URI
          if (!fileUri.startsWith("file://")) {
            throw new Error("Invalid image URI format");
          }

          // 1. Optimize image and get base64
          const base64 = await optimizeImage(fileUri);

          // 2. Create event with base64 image (backend handles upload now)
          const startWorkflow = await eventFromImageBase64({
            base64Image: base64,
            userId,
            username,
            lists: [],
            timezone: userTimezone,
            visibility: "private",
            sendNotification,
          });

          // 3. Track the workflow in our store
          addWorkflowId(startWorkflow.workflowId);

          return startWorkflow.workflowId;
        }

        // Handle URL events with workflow
        if (linkPreview) {
          // Start URL workflow
          const startWorkflow = await eventFromUrl({
            url: linkPreview,
            userId,
            username,
            lists: [],
            timezone: userTimezone,
            visibility: "private",
            sendNotification,
          });

          // Track the workflow in our store
          addWorkflowId(startWorkflow.workflowId);

          return startWorkflow.workflowId;
        }

        // Handle text events (not yet implemented with workflows)
        if (rawText) {
          const startWorkflow = await eventFromText({
            rawText,
            userId,
            username,
            lists: [],
            timezone: userTimezone,
            visibility: "private",
            sendNotification,
          });

          // Track the workflow in our store
          addWorkflowId(startWorkflow.workflowId);

          return startWorkflow.workflowId;
        }

        throw new Error("No image, URL, or text provided for event creation");
      } catch (error) {
        logError("Error processing event", error);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        throw error; // Rethrow to trigger mutation's onError
      } finally {
        // Reset loading state for both routes
        setIsImageLoading(false, "add");
        setIsImageLoading(false, "new");

        if (!suppressCapturing) {
          setIsCapturing(false);
        }
      }
    },
    [
      userTimezone,
      addWorkflowId,
      setIsImageLoading,
      setIsCapturing,
      eventFromImageBase64,
      eventFromUrl,
      eventFromText,
    ],
  );

  return createEvent;
}
