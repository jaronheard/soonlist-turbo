import { useEffect } from "react";
import * as MediaLibrary from "expo-media-library";

import { useAppStore } from "~/store";

export function useMediaPermissions() {
  const { setHasMediaPermission } = useAppStore();

  useEffect(() => {
    let subscription: MediaLibrary.Subscription | undefined;

    async function initializeMediaPermissions() {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        setHasMediaPermission(status === MediaLibrary.PermissionStatus.GRANTED);

        if (status === MediaLibrary.PermissionStatus.GRANTED) {
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
        }
      } catch (error) {
        console.error("Error requesting media permissions:", error);
        setHasMediaPermission(false);
      }
    }

    void initializeMediaPermissions();

    // Always return a cleanup function
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [setHasMediaPermission]);
}
