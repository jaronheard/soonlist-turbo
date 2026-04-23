import { useCallback } from "react";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { useMutation } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { DEFAULT_VISIBILITY } from "~/constants";
import { useOneSignal } from "~/providers/OneSignalProvider";
import { useAppStore, useUserTimezone } from "~/store";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";
import { logError } from "~/utils/errorLogging";
import { hapticError } from "~/utils/feedback";

function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

interface CreateEventOptions {
  imageUri?: string;
  userId: string;
  username: string;
  sendNotification?: boolean;
  suppressCapturing?: boolean;
  rawText?: string;
  linkPreview?: string;
}

async function optimizeImage(uri: string): Promise<string> {
  try {
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
  const setIsCapturing = useInFlightEventStore((s) => s.setIsCapturing);
  const addPendingBatchId = useInFlightEventStore((s) => s.addPendingBatchId);
  const { hasNotificationPermission } = useOneSignal();
  const userTimezone = useUserTimezone();

  const createEventBatch = useMutation(api.ai.createEventBatch);
  const addImagesToBatch = useMutation(api.ai.addImagesToBatch);

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

        if (imageUri) {
          setIsImageLoading(true, "add");
          setIsImageLoading(true, "new");

          let fileUri = imageUri;
          if (imageUri.startsWith("ph://")) {
            const assetId = imageUri.replace("ph://", "");
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

          if (!fileUri.startsWith("file://")) {
            throw new Error("Invalid image URI format");
          }

          const batchId = generateBatchId();

          await createEventBatch({
            batchId,
            images: [],
            totalCount: 1,
            userId,
            username,
            lists: [],
            timezone: userTimezone,
            visibility: DEFAULT_VISIBILITY,
            sendNotification,
          });

          const base64 = await optimizeImage(fileUri);

          await addImagesToBatch({
            batchId,
            images: [{ base64Image: base64, tempId: `${batchId}-0` }],
          });

          if (!hasNotificationPermission || !sendNotification) {
            addPendingBatchId(batchId);
          }

          return batchId;
        }

        if (linkPreview) {
          const startWorkflow = await eventFromUrl({
            url: linkPreview,
            userId,
            username,
            lists: [],
            timezone: userTimezone,
            visibility: DEFAULT_VISIBILITY,
            sendNotification,
          });

          addWorkflowId(startWorkflow.workflowId);

          return startWorkflow.workflowId;
        }

        if (rawText) {
          const startWorkflow = await eventFromText({
            rawText,
            userId,
            username,
            lists: [],
            timezone: userTimezone,
            visibility: DEFAULT_VISIBILITY,
            sendNotification,
          });

          addWorkflowId(startWorkflow.workflowId);

          return startWorkflow.workflowId;
        }

        throw new Error("No image, URL, or text provided for event creation");
      } catch (error) {
        logError("Error processing event", error);
        void hapticError();
        throw error;
      } finally {
        setIsImageLoading(false, "add");
        setIsImageLoading(false, "new");

        if (!suppressCapturing) {
          setIsCapturing(false);
        }
      }
    },
    [
      setIsCapturing,
      setIsImageLoading,
      createEventBatch,
      addImagesToBatch,
      hasNotificationPermission,
      addPendingBatchId,
      userTimezone,
      addWorkflowId,
      eventFromUrl,
      eventFromText,
    ],
  );

  const createMultipleEvents = useCallback(
    async (
      tasks: CreateEventOptions[],
      { suppressCapturing = false }: { suppressCapturing?: boolean } = {},
    ): Promise<string | undefined> => {
      if (!tasks.length) return undefined;

      const batchId = generateBatchId();

      try {
        if (!suppressCapturing) {
          setIsCapturing(true);
        }
        setIsImageLoading(true, "add");
        setIsImageLoading(true, "new");

        const { userId, username, sendNotification = true } = tasks[0]!;

        await createEventBatch({
          batchId,
          images: [], // Start with empty array
          totalCount: tasks.length, // Tell backend expected total
          userId,
          username,
          lists: [],
          timezone: userTimezone,
          visibility: "private",
          sendNotification,
        });

        const imagePromises = tasks.map(async (task, index) => {
          if (!task.imageUri) {
            throw new Error("No image URI provided");
          }

          let fileUri = task.imageUri;
          if (task.imageUri.startsWith("ph://")) {
            const assetId = task.imageUri.replace("ph://", "");
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

          if (!fileUri.startsWith("file://")) {
            throw new Error("Invalid image URI format");
          }

          const base64 = await optimizeImage(fileUri);

          const image = {
            base64Image: base64,
            tempId: `${batchId}-${index}`,
          };

          await addImagesToBatch({
            batchId,
            images: [image],
          });

          return image;
        });

        await Promise.all(imagePromises);

        if (!hasNotificationPermission || !sendNotification) {
          addPendingBatchId(batchId);
        }

        return batchId;
      } catch (error) {
        logError("Error creating events batch", error);
        void hapticError();
        throw error;
      } finally {
        if (!suppressCapturing) {
          setIsCapturing(false);
        }
        setIsImageLoading(false, "add");
        setIsImageLoading(false, "new");
      }
    },
    [
      createEventBatch,
      addImagesToBatch,
      hasNotificationPermission,
      addPendingBatchId,
      userTimezone,
      setIsCapturing,
      setIsImageLoading,
    ],
  );

  return {
    createEvent,
    createMultipleEvents,
  };
}
