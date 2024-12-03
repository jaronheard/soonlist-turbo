import type * as MediaLibrary from "expo-media-library";
import * as TaskManager from "expo-task-manager";

export const MEDIA_LIBRARY_BACKGROUND_TASK = "MEDIA_LIBRARY_BACKGROUND_TASK";

type TaskBody = TaskManager.TaskManagerTaskBody<unknown>;

// Define the background task
TaskManager.defineTask(
  MEDIA_LIBRARY_BACKGROUND_TASK,
  ({ data, error }: TaskBody) => {
    if (error) {
      console.error("Background task error:", error);
      return;
    }

    const event = data as MediaLibrary.MediaLibraryAssetsChangeEvent;
    console.log("Background Media Library Change:", event);

    // Log mediaSubtypes for inserted assets
    event.insertedAssets?.forEach((asset: MediaLibrary.Asset) => {
      console.log(
        "Background Inserted Asset MediaSubtypes:",
        asset.mediaSubtypes,
      );
    });

    // You can perform additional background processing here
    // Like uploading to a server, updating local storage, etc.
  },
);
