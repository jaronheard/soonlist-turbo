import { useCallback } from "react";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { toast } from "sonner-native";

import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore, useUserTimezone } from "~/store";
import { api } from "~/utils/api";
import { logError } from "~/utils/errorLogging";

interface CreateEventOptions {
  rawText?: string;
  linkPreview?: string;
  imageUri?: string;
  userId: string;
  username: string;
}

interface CreateEventResult {
  success: boolean;
  eventId: string | undefined;
  ticket?: unknown;
  error?: string;
}

export function useCreateEvent() {
  const { setIsImageLoading } = useAppStore();
  const { customerInfo, showProPaywallIfNeeded } = useRevenueCat();
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
  const eventFromImage =
    api.ai.eventFromImageThenCreateThenNotification.useMutation({
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

      const { rawText, linkPreview, imageUri, userId, username } = options;

      // URL flow
      if (linkPreview) {
        const result = (await eventFromUrl.mutateAsync({
          url: linkPreview,
          userId,
          username,
          lists: [],
          timezone: userTimezone,
          visibility: "private",
          expoPushToken: "", // Add empty token as it's required by the API
        })) as CreateEventResult;
        return result.success && result.eventId ? result.eventId : undefined;
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

          // 1. Manipulate image
          let manipulatedImage;
          try {
            manipulatedImage = await ImageManipulator.manipulateAsync(
              fileUri,
              [{ resize: { width: 1000 } }],
              { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP },
            );
          } catch (error) {
            throw new Error(
              `Failed to manipulate image: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }

          // Validate manipulated image
          if (!manipulatedImage.uri) {
            throw new Error("Image manipulation failed - no URI returned");
          }

          let base64Data;
          try {
            const fileInfo = await FileSystem.getInfoAsync(
              manipulatedImage.uri,
            );
            if (!fileInfo.exists) {
              throw new Error("File does not exist");
            }

            base64Data = await FileSystem.readAsStringAsync(
              manipulatedImage.uri,
              {
                encoding: FileSystem.EncodingType.Base64,
              },
            );

            if (!base64Data) {
              throw new Error("Failed to read image data as base64");
            }
          } catch (error) {
            throw new Error(
              `Failed to get base64 data: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }

          const dataUrl = `data:image/webp;base64,${base64Data}`;

          // 4. Create event with base64 data URL instead of uploaded URL
          const result = (await eventFromImage.mutateAsync({
            imageUrl: dataUrl,
            userId,
            username,
            lists: [],
            timezone: userTimezone,
            visibility: "private",
            expoPushToken: "", // Add empty token as it's required by the API
          })) as CreateEventResult;

          if (!result.success) {
            throw new Error(result.error ?? "Failed to create event");
          }

          return result.eventId;
        } catch (error) {
          logError("Error processing image", error);
        } finally {
          // Reset loading state for both routes
          setIsImageLoading(false, "add");
          setIsImageLoading(false, "new");
        }
      }

      // Raw text flow
      if (rawText) {
        const result = (await eventFromRaw.mutateAsync({
          rawText,
          userId,
          username,
          lists: [],
          timezone: userTimezone,
          visibility: "private",
          expoPushToken: "", // Add empty token as it's required by the API
        })) as CreateEventResult;
        return result.success && result.eventId ? result.eventId : undefined;
      }

      return undefined;
    },
    [
      hasUnlimited,
      showProPaywallIfNeeded,
      customerInfo?.entitlements.active.unlimited?.isActive,
      eventFromUrl,
      eventFromImage,
      eventFromRaw,
      setIsImageLoading,
      userTimezone,
    ],
  );

  return { createEvent };
}
