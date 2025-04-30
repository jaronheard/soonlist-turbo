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

async function optimizeImage(uri: string) {
  const manipulatedImage = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1284 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.WEBP },
  );

  // Convert to base64
  const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    base64,
    uri: manipulatedImage.uri,
  };
}

interface UploadResponse {
  fileUrl: string;
}

async function uploadImageToCDN(uri: string): Promise<string> {
  const response = await FileSystem.uploadAsync(
    "https://api.bytescale.com/v2/accounts/12a1yek/uploads/binary",
    uri,
    {
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      httpMethod: "POST",
      headers: {
        "Content-Type": "image/webp",
        Authorization: "Bearer public_12a1yekATNiLj4VVnREZ8c7LM8V8",
      },
    },
  );

  if (response.status !== 200) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  const parsedResponse = JSON.parse(response.body) as UploadResponse;
  return parsedResponse.fileUrl;
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

          // 1. Optimize image and get base64
          const { base64, uri } = await optimizeImage(fileUri);

          // 2. Create event with base64 image
          const eventResult = await eventFromImageBase64.mutateAsync({
            base64Image: base64,
            userId,
            username,
            lists: [],
            timezone: userTimezone,
            visibility: "private",
          });

          if (!eventResult.success) {
            throw new Error(eventResult.error ?? "Failed to create event");
          }

          // 3. Upload image to CDN in background
          uploadImageToCDN(uri).catch((error) => {
            logError("Error uploading image to CDN", error);
          });

          return eventResult.eventId;
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
        })) as CreateEventResult;
        return result.success && result.eventId ? result.eventId : undefined;
      }

      return undefined;
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
    ],
  );

  return { createEvent };
}
