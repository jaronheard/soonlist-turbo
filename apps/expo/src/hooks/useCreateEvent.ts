import { useCallback } from "react";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { toast } from "sonner-native";

import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { api } from "~/utils/api";

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
  const hasUnlimited = customerInfo?.entitlements.active.unlimited;
  const utils = api.useUtils();
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
          timezone: "America/Los_Angeles",
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

          // 1. Manipulate image
          let manipulatedImage;
          try {
            manipulatedImage = await ImageManipulator.manipulateAsync(
              fileUri,
              [{ resize: { width: 1284 } }],
              { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
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

          // 2. Upload image
          let response;
          try {
            response = await FileSystem.uploadAsync(
              "https://api.bytescale.com/v2/accounts/12a1yek/uploads/binary",
              manipulatedImage.uri,
              {
                uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                httpMethod: "POST",
                headers: {
                  "Content-Type": "image/jpeg",
                  Authorization: "Bearer public_12a1yekATNiLj4VVnREZ8c7LM8V8",
                },
              },
            );
          } catch (error) {
            throw new Error(
              `Failed to upload image: ${error instanceof Error ? error.message : "Network error"}`,
            );
          }

          if (response.status !== 200) {
            throw new Error(
              `Upload failed with status ${response.status}: ${response.body}`,
            );
          }

          // 3. Parse response
          let fileUrl: string;
          try {
            if (!response.body) {
              throw new Error("Empty response from upload server");
            }
            const parsed = JSON.parse(response.body) as { fileUrl?: string };
            if (!parsed.fileUrl) {
              throw new Error("No file URL in response");
            }
            fileUrl = parsed.fileUrl;
          } catch (error) {
            throw new Error(
              `Failed to parse upload response: ${error instanceof Error ? error.message : "Invalid JSON"}`,
            );
          }

          // 4. Create event
          const result = (await eventFromImage.mutateAsync({
            imageUrl: fileUrl,
            userId,
            username,
            lists: [],
            timezone: "America/Los_Angeles",
            visibility: "private",
          })) as CreateEventResult;

          if (!result.success) {
            throw new Error(result.error ?? "Failed to create event");
          }

          return result.eventId;
        } catch (error) {
          console.error("Error processing image:", error);
          throw error;
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
          timezone: "America/Los_Angeles",
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
      eventFromImage,
      eventFromRaw,
      setIsImageLoading,
    ],
  );

  return { createEvent };
}
