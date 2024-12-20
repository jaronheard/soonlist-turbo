import { useEffect } from "react";
import * as MediaLibrary from "expo-media-library";

import { useAppStore } from "~/store";
import { showToast } from "~/utils/toast";

export function useMediaPermissions() {
  const { setHasMediaPermission } = useAppStore();

  useEffect(() => {
    let subscription: MediaLibrary.Subscription | undefined;

    async function initializeMediaPermissions() {
      try {
        const { status, canAskAgain } =
          await MediaLibrary.requestPermissionsAsync();
        const isGranted = status === MediaLibrary.PermissionStatus.GRANTED;
        setHasMediaPermission(isGranted);

        if (isGranted) {
          subscription = MediaLibrary.addListener(
            ({ hasIncrementalChanges, insertedAssets }) => {
              if (
                hasIncrementalChanges &&
                insertedAssets &&
                insertedAssets.length > 0
              ) {
                useAppStore.setState({ shouldRefreshMediaLibrary: true });
              }
            },
          );
        } else {
          const message = canAskAgain
            ? "Photo access denied. Please grant permission in settings."
            : "Photo access permanently denied. Update permissions in system settings.";
          showToast(message, "error");
        }
      } catch (error) {
        console.error("Error requesting media permissions:", error);
        showToast("Failed to request photo permissions", "error");
        setHasMediaPermission(false);
      }
    }

    void initializeMediaPermissions();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [setHasMediaPermission]);
}
