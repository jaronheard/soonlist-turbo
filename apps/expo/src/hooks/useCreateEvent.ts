import { useCallback } from "react";
import * as ImageManipulator from "expo-image-manipulator";
import { useMutation } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import type { ExifOrientation } from "~/utils/images";
import { DEFAULT_VISIBILITY } from "~/constants";
import { useOneSignal } from "~/providers/OneSignalProvider";
import { useAppStore, useUserTimezone } from "~/store";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";
import { logError } from "~/utils/errorLogging";
import { hapticError } from "~/utils/feedback";
import { getOrientationActions } from "~/utils/images";

// Generate a simple batch ID without external dependencies
function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

interface CreateEventOptions {
  imageUri?: string;
  imageOrientation?: ExifOrientation;
  userId: string;
  username: string;
  sendNotification?: boolean;
  suppressCapturing?: boolean;
  // Legacy field for text events (not yet implemented with workflows)
  rawText?: string;
  linkPreview?: string;
}

// Chains any EXIF rotation into the same manipulateAsync call as the resize.
// WEBP output drops the EXIF Orientation tag without honoring it, so a
// separate normalize pass would be needed otherwise.
async function optimizeImage(
  uri: string,
  orientation?: ExifOrientation,
): Promise<string> {
  try {
    const { base64 } = await ImageManipulator.manipulateAsync(
      uri,
      [...getOrientationActions(orientation), { resize: { width: 640 } }],
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

  // Batch mutations for all image events (single and multiple)
  const createEventBatch = useMutation(api.ai.createEventBatch);
  const addImagesToBatch = useMutation(api.ai.addImagesToBatch);

  // Keep workflow versions for URL and text (for now)
  const eventFromUrl = useMutation(api.ai.eventFromUrlThenCreate);
  const eventFromText = useMutation(api.ai.eventFromTextThenCreate);

  const createEvent = useCallback(
    async (options: CreateEventOptions): Promise<string> => {
      const {
        imageUri,
        imageOrientation,
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

          if (!imageUri.startsWith("file://")) {
            throw new Error("Invalid image URI format");
          }
          const fileUri = imageUri;

          // Route single images through batch system for unified tracking
          const batchId = generateBatchId();

          // 1. Create the batch with totalCount of 1
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

          // 2. Optimize image and get base64
          const base64 = await optimizeImage(fileUri, imageOrientation);

          // 3. Add the image to the batch
          await addImagesToBatch({
            batchId,
            images: [{ base64Image: base64, tempId: `${batchId}-0` }],
          });

          // 4. Track batch for completion feedback if user doesn't have notifications
          if (!hasNotificationPermission || !sendNotification) {
            addPendingBatchId(batchId);
          }

          return batchId;
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
            visibility: DEFAULT_VISIBILITY,
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
            visibility: DEFAULT_VISIBILITY,
            sendNotification,
          });

          // Track the workflow in our store
          addWorkflowId(startWorkflow.workflowId);

          return startWorkflow.workflowId;
        }

        throw new Error("No image, URL, or text provided for event creation");
      } catch (error) {
        logError("Error processing event", error);
        void hapticError();
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

  // Batch creation with smart notifications
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

        // Step 1: Create the batch immediately (with 0 images)
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

        // Step 2: Process and stream images as they're ready
        const imagePromises = tasks.map(async (task, index) => {
          if (!task.imageUri) {
            throw new Error("No image URI provided");
          }

          if (!task.imageUri.startsWith("file://")) {
            throw new Error("Invalid image URI format");
          }
          const fileUri = task.imageUri;

          // Optimize image and get base64
          const base64 = await optimizeImage(fileUri, task.imageOrientation);

          // Immediately send this image to the backend
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

        // Wait for all images to be processed and sent
        await Promise.all(imagePromises);

        // Track batch for completion feedback if user doesn't have notifications
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
