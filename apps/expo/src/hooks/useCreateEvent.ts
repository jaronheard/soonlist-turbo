import { useCallback } from "react";
import { InteractionManager } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import pMap from "p-map";
import { toast } from "sonner-native";

import { useRevenueCat } from "~/providers/RevenueCatProvider";
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

const CONCURRENCY_LIMIT = 5; // tweak as needed

// Optimize image off the main JS thread and return a base64 string
async function optimizeImage(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Defer heavy work until after UI interactions/animations finish
    void InteractionManager.runAfterInteractions(async () => {
      try {
        // Resize & compress on the native thread and get base64 in a single step
        const { base64, uri: tmpUri } = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 800 } }],
          {
            compress: 0.7,
            format: ImageManipulator.SaveFormat.WEBP,
            base64: true,
          },
        );

        if (!base64) {
          throw new Error("Failed to encode image to base64");
        }

        // Delete the temporary file asynchronously (fire-and-forget)
        FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(() => {});

        resolve(base64);
      } catch (error) {
        logError("Error manipulating image", error);
        reject(new Error("Failed to optimize image for upload"));
      }
    });
  });
}

export async function enqueueEvents(
  tasks: CreateEventOptions[],
  deps: {
    createSingle: (o: CreateEventOptions) => Promise<string | undefined>;
    setIsCapturing: (b: boolean) => void;
  },
) {
  const { createSingle, setIsCapturing } = deps;
  if (!tasks.length) return;

  setIsCapturing(true);
  try {
    await pMap(
      tasks,
      (task) => createSingle({ ...task, suppressCapturing: true }),
      { concurrency: CONCURRENCY_LIMIT },
    );
  } finally {
    setIsCapturing(false);
  }
}

export function useCreateEvent() {
  const { setIsImageLoading } = useAppStore();
  const { customerInfo, showProPaywallIfNeeded } = useRevenueCat();
  const { setIsCapturing } = useInFlightEventStore();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;
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
      // Check for subscription before proceeding
      if (!hasUnlimited) {
        await showProPaywallIfNeeded();
        // Re-check subscription status after paywall
        if (!customerInfo?.entitlements.active.unlimited) {
          toast.error("Pro subscription required to add events");
          return undefined;
        }
      }

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
      hasUnlimited,
      showProPaywallIfNeeded,
      customerInfo?.entitlements.active.unlimited,
      eventFromUrl,
      userTimezone,
      setIsImageLoading,
      eventFromImageBase64,
      eventFromRaw,
      setIsCapturing,
    ],
  );

  return {
    createEvent,
    enqueueEvents: (tasks: CreateEventOptions[]) =>
      enqueueEvents(tasks, { createSingle: createEvent, setIsCapturing }),
  };
}
