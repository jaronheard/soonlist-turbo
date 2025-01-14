import { useCallback } from "react";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

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
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: 1284 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );

        const response = await FileSystem.uploadAsync(
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

        if (response.status !== 200) {
          throw new Error(`Upload failed: ${response.status}`);
        }
        const { fileUrl } = JSON.parse(response.body) as { fileUrl: string };

        const result = (await eventFromImage.mutateAsync({
          imageUrl: fileUrl,
          userId,
          username,
          expoPushToken,
          lists: [],
          timezone: "America/Los_Angeles",
          visibility: "private",
        })) as CreateEventResult;
        return result.success && result.eventId ? result.eventId : undefined;
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
    [eventFromUrl, eventFromImage, eventFromRaw],
  );

  return { createEvent };
}
