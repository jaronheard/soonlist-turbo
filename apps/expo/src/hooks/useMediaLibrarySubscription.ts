import { useEffect } from "react";
import * as BackgroundFetch from "expo-background-fetch";
import * as MediaLibrary from "expo-media-library";
import * as TaskManager from "expo-task-manager";

import { MEDIA_LIBRARY_BACKGROUND_TASK } from "../tasks/mediaLibraryBackgroundTask";

async function registerBackgroundTask() {
  try {
    await BackgroundFetch.registerTaskAsync(
      MEDIA_LIBRARY_BACKGROUND_TASK as string,
      {
        minimumInterval: 60, // 1 minute (minimum allowed)
        stopOnTerminate: false,
        startOnBoot: true,
      },
    );
  } catch (err) {
    console.error("Task registration failed:", err);
  }
}

export function useMediaLibrarySubscription() {
  useEffect(() => {
    let subscription: MediaLibrary.Subscription | null = null;

    const setupSubscription = async () => {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== MediaLibrary.PermissionStatus.GRANTED) {
        console.log("Media Library permission not granted");
        return;
      }

      // Register background task if not already registered
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        MEDIA_LIBRARY_BACKGROUND_TASK as string,
      );

      if (!isRegistered) {
        await registerBackgroundTask();
      }

      // Set up foreground subscription
      subscription = MediaLibrary.addListener(
        (event: MediaLibrary.MediaLibraryAssetsChangeEvent) => {
          console.log("Foreground Media Library Change:", event);

          event.insertedAssets?.forEach((asset: MediaLibrary.Asset) => {
            console.log(
              "Foreground Inserted Asset MediaSubtypes:",
              asset.mediaSubtypes,
            );
          });
        },
      );
    };

    void setupSubscription();

    // Cleanup
    return () => {
      if (subscription) {
        MediaLibrary.removeSubscription(subscription);
      }
    };
  }, []);
}
