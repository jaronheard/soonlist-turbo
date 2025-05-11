import { useCallback } from "react";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { toast } from "sonner-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { showEventCaptureToast } from "~/components/EventCaptureToast";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore, useUserTimezone } from "~/store";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";
import { useUploadQueueStore } from "~/store/useUploadQueueStore";
import { api } from "~/utils/api";
import { logError } from "~/utils/errorLogging";

interface CreateEventOptions {
  rawText?: string;
  linkPreview?: string;
  imageUri?: string;
  userId: string;
  username: string;
  sendNotification?: boolean;
  queueItemId?: string;
}

type _EventResponse =
  RouterOutputs["ai"]["eventFromUrlThenCreateThenNotification"];

// Optimize image and return base64 string
async function optimizeImage(uri: string): Promise<string> {
  try {
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], // Keep resizing
      { compress: 0.7, format: ImageManipulator.SaveFormat.WEBP }, // Keep compression and format
    );

    // Convert to base64
    const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Clean up the temporary manipulated image file
    await FileSystem.deleteAsync(manipulatedImage.uri, { idempotent: true });

    return base64;
  } catch (error) {
    logError("Error manipulating image", error);
    throw new Error("Failed to optimize image for upload");
  }
}

export function useCreateEvent() {
  const { setIsImageLoading } = useAppStore();
  const { customerInfo, showProPaywallIfNeeded } = useRevenueCat();
  const { setIsCapturing } = useInFlightEventStore();
  const startItem = useUploadQueueStore((state) => state.startItem);
  const succeedItem = useUploadQueueStore((state) => state.succeedItem);
  const failItem = useUploadQueueStore((state) => state.failItem);
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
        sendNotification = false,
        queueItemId,
      } = options;

      try {
        setIsCapturing(true);
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
            showEventCaptureToast({
              id: result.event.id,
              event: result.event.event as AddToCalendarButtonPropsRestricted,
              visibility: result.event.visibility,
            });
            return result.event.id;
          }
          return undefined;
        }

        // Image flow
        if (imageUri) {
          if (queueItemId) {
            startItem(queueItemId);
          }
          // Set loading state for both routes since we don't know which one is active
          setIsImageLoading(true, "add");
          setIsImageLoading(true, "new");

          try {
            // Convert photo library URI to file URI if needed
            let fileUri = imageUri;
            if (imageUri.startsWith("ph://")) {
              const assetId = imageUri.replace("ph://", "").split("/")[0];
              if (!assetId) {
                const err = new Error("Invalid photo library asset ID");
                if (queueItemId) failItem(queueItemId, err.message);
                throw err;
              }
              const asset = await MediaLibrary.getAssetInfoAsync(assetId);
              if (!asset.localUri) {
                const err = new Error(
                  "Could not get local URI for photo library asset",
                );
                if (queueItemId) failItem(queueItemId, err.message);
                throw err;
              }
              fileUri = asset.localUri;
            }

            // Validate image URI
            if (!fileUri.startsWith("file://")) {
              const err = new Error("Invalid image URI format");
              if (queueItemId) failItem(queueItemId, err.message);
              throw err;
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
              const errorMessage =
                eventResult.error ?? "Failed to create event";
              if (queueItemId) {
                failItem(queueItemId, errorMessage);
              }
              throw new Error(errorMessage);
            }

            if ("event" in eventResult && eventResult.event) {
              if (queueItemId) {
                succeedItem(queueItemId, eventResult.event.id);
              }
              showEventCaptureToast({
                id: eventResult.event.id,
                event: eventResult.event
                  .event as AddToCalendarButtonPropsRestricted,
                visibility: eventResult.event.visibility,
              });
              return eventResult.event.id;
            }
            // Should not happen if success is true and event is expected
            const fallBackError = "Event data missing in successful response.";
            if (queueItemId) failItem(queueItemId, fallBackError);
            logError(fallBackError, eventResult);
            return undefined;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            if (queueItemId) {
              failItem(queueItemId, errorMessage);
            }
            logError("Error processing image in createEvent", error);
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
            showEventCaptureToast({
              id: result.event.id,
              event: result.event.event as AddToCalendarButtonPropsRestricted,
              visibility: result.event.visibility,
            });
            return result.event.id;
          }
          return undefined;
        }

        return undefined;
      } finally {
        setIsCapturing(false);
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
      startItem,
      succeedItem,
      failItem,
    ],
  );

  return { createEvent };
}
