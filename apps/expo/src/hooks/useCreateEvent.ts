import { useCallback } from "react";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

import { useAppStore } from "~/store";
import { api } from "~/utils/api";

interface CreateEventOptions {
  rawText?: string;
  linkPreview?: string;
  imageUri?: string;
  userId: string;
  username: string;
  expoPushToken: string;
}

interface CreateEventResult {
  success: boolean;
  eventId: string | undefined;
  ticket?: unknown;
  error?: string;
}

export function useCreateEvent() {
  const { setIsImageLoading } = useAppStore();
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
      const {
        rawText,
        linkPreview,
        imageUri,
        userId,
        username,
        expoPushToken,
      } = options;

      // URL flow
      if (linkPreview) {
        const result = (await eventFromUrl.mutateAsync({
          url: linkPreview,
          userId,
          username,
          expoPushToken,
          lists: [],
          timezone: "America/Los_Angeles",
          visibility: "private",
        })) as CreateEventResult;
        return result.success && result.eventId ? result.eventId : undefined;
      }

      // Image flow
      if (imageUri) {
        try {
          setIsImageLoading(true);

          // Validate image URI
          if (!imageUri.startsWith("file://")) {
            throw new Error("Invalid image URI format");
          }

          // 1. Manipulate image
          let manipulatedImage;
          try {
            manipulatedImage = await ImageManipulator.manipulateAsync(
              imageUri,
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
            expoPushToken,
            lists: [],
            timezone: "America/Los_Angeles",
            visibility: "private",
          })) as CreateEventResult;

          if (!result.success) {
            throw new Error(result.error ?? "Failed to create event");
          }

          return result.eventId;
        } catch (error) {
          console.error("[useCreateEvent] Image upload failed:", error);
          throw error;
        } finally {
          setIsImageLoading(false);
        }
      }

      // Raw text flow
      if (rawText?.trim()) {
        const result = (await eventFromRaw.mutateAsync({
          rawText,
          userId,
          username,
          expoPushToken,
          lists: [],
          timezone: "America/Los_Angeles",
          visibility: "private",
        })) as CreateEventResult;
        return result.success && result.eventId ? result.eventId : undefined;
      }

      return undefined;
    },
    [eventFromUrl, setIsImageLoading, eventFromImage, eventFromRaw],
  );

  return { createEvent };
}
