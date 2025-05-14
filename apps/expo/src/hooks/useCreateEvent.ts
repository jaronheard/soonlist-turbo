import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import pMap from "p-map";
import { toast } from "sonner-native";

import { useOneSignal } from "~/providers/OneSignalProvider";
import { useAppStore, useUserTimezone } from "~/store";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";
import { api } from "~/utils/api";
import { logError } from "~/utils/errorLogging";

interface CreateEventOptions {
  rawText?: string;
  linkPreview?: string;
  imageUri?: string;
  userId: string;
  username: string;
  sendNotification?: boolean;
  suppressCapturing?: boolean;
}

const CONCURRENCY_LIMIT = 4; // tweak as needed

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

export async function enqueueEvents(
  tasks: CreateEventOptions[],
  deps: {
    createSingle: (o: CreateEventOptions) => Promise<string | undefined>;
    setIsCapturing: (b: boolean) => void;
    logError: (
      message: string,
      error: unknown,
      context?: Record<string, unknown>,
    ) => void;
    hasNotificationPermission: boolean;
  },
) {
  const {
    createSingle,
    setIsCapturing,
    logError: log,
    hasNotificationPermission,
  } = deps;
  if (!tasks.length) return;

  // We don't set isCapturing to true here anymore as it's already set in triggerAddEventFlow
  // setIsCapturing(true);
  const results = {
    successCount: 0,
    failureCount: 0,
  };

  try {
    await pMap(
      tasks,
      async (task) => {
        try {
          // Attempt to create the single event
          const eventId = await createSingle({
            ...task,
            suppressCapturing: true,
          });
          if (eventId) {
            results.successCount++;
          } else {
            // This case might occur if createSingle returns undefined without throwing,
            // e.g., due to paywall or other handled conditions within createSingle.
            results.failureCount++;
            log(
              "Event creation returned no ID (handled failure)",
              new Error("createSingle returned undefined"),
              { task },
            );
          }
        } catch (error) {
          // Log the error for the specific task and increment failure count
          results.failureCount++;
          log("Error processing single event in enqueueEvents batch", error, {
            task,
          });
          // We don't rethrow here, so pMap continues with other tasks
        }
      },
      { concurrency: CONCURRENCY_LIMIT },
    );
  } finally {
    setIsCapturing(false);
    // Optionally, provide feedback based on results
    if (results.failureCount > 0) {
      toast.error(
        `${results.failureCount} event(s) failed to process. ${results.successCount} succeeded.`,
      );
    } else if (results.successCount > 0) {
      if (!hasNotificationPermission) {
        toast.success(
          `${results.successCount} event${results.successCount > 1 ? "s" : ""} captured successfully!`,
        );
      }
      // If notifications are enabled, we rely on the native notification.
    }
  }
}

export function useCreateEvent() {
  const { setIsImageLoading } = useAppStore();
  const { setIsCapturing } = useInFlightEventStore();
  const { hasNotificationPermission } = useOneSignal();
  const utils = api.useUtils();
  const userTimezone = useUserTimezone();

  const eventFromUrl =
    api.ai.eventFromUrlThenCreateThenNotification.useMutation({
      onSuccess: () => {
        return Promise.all([
          utils.event.getEventsForUser.invalidate(),
          utils.event.getStats.invalidate(),
        ]);
      },
    });
  const eventFromImageBase64 =
    api.ai.eventFromImageBase64ThenCreate.useMutation({
      onSuccess: () => {
        return Promise.all([
          utils.event.getEventsForUser.invalidate(),
          utils.event.getStats.invalidate(),
        ]);
      },
    });
  const eventFromRaw =
    api.ai.eventFromRawTextThenCreateThenNotification.useMutation({
      onSuccess: () => {
        return Promise.all([
          utils.event.getEventsForUser.invalidate(),
          utils.event.getStats.invalidate(),
        ]);
      },
    });

  const createEvent = useCallback(
    async (options: CreateEventOptions): Promise<string | undefined> => {
      const {
        rawText,
        linkPreview,
        imageUri,
        userId,
        username,
        sendNotification = true,
      } = options;

      try {
        if (!options.suppressCapturing) {
          setIsCapturing(true);
        }
        // URL flow
        if (linkPreview) {
          const result = await eventFromUrl.mutateAsync({
            url: linkPreview,
            userId,
            username,
            lists: [],
            timezone: userTimezone,
            visibility: "private",
            sendNotification,
          });

          if (result.success && "event" in result && result.event) {
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
            if (sendNotification && !hasNotificationPermission) {
              toast.success("Event captured successfully!");
            }
            return result.event.id;
          }
          return undefined;
        }

        // Image flow
        if (imageUri) {
          // Set loading state for both routes since we don't know which one is active
          setIsImageLoading(true, "add");
          setIsImageLoading(true, "new");

          try {
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
            const eventResult = await eventFromImageBase64.mutateAsync({
              base64Image: base64,
              userId,
              username,
              lists: [],
              timezone: userTimezone,
              visibility: "private",
              sendNotification,
            });

            if (!eventResult.success) {
              throw new Error(eventResult.error ?? "Failed to create event");
            }

            if ("event" in eventResult && eventResult.event) {
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              if (sendNotification && !hasNotificationPermission) {
                toast.success("Event captured successfully!");
              }
              return eventResult.event.id;
            }
            return undefined;
          } catch (error) {
            logError("Error processing image", error);
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Error,
            );
            throw error; // Rethrow to trigger mutation's onError
          } finally {
            // Reset loading state for both routes
            setIsImageLoading(false, "add");
            setIsImageLoading(false, "new");
          }
        }

        // Raw text flow
        if (rawText) {
          const result = await eventFromRaw.mutateAsync({
            rawText,
            userId,
            username,
            lists: [],
            timezone: userTimezone,
            visibility: "private",
            sendNotification,
          });

          if (result.success && "event" in result && result.event) {
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
            if (sendNotification && !hasNotificationPermission) {
              toast.success("Event captured successfully!");
            }
            return result.event.id;
          }
          return undefined;
        }

        return undefined;
      } finally {
        if (!options.suppressCapturing) {
          setIsCapturing(false);
        }
      }
    },
    [
      eventFromUrl,
      userTimezone,
      setIsImageLoading,
      eventFromImageBase64,
      eventFromRaw,
      setIsCapturing,
      hasNotificationPermission,
    ],
  );

  return {
    createEvent,
    enqueueEvents: (tasks: CreateEventOptions[]) =>
      enqueueEvents(tasks, {
        createSingle: createEvent,
        setIsCapturing,
        logError,
        hasNotificationPermission,
      }),
  };
}
