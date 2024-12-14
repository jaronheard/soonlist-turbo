import { useEffect } from "react";
import * as MediaLibrary from "expo-media-library";

import { useAppStore } from "~/store";

export function useMediaPermissions() {
  const { setHasMediaPermission } = useAppStore();

  useEffect(() => {
    async function initializeMediaPermissions() {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        setHasMediaPermission(status === MediaLibrary.PermissionStatus.GRANTED);

        // Subscribe to media library changes if permission is granted
        if (status === MediaLibrary.PermissionStatus.GRANTED) {
          const subscription = MediaLibrary.addListener(
            ({ hasIncrementalChanges, insertedAssets }) => {
              // Only trigger a refresh if there are actual changes
              if (
                hasIncrementalChanges &&
                insertedAssets &&
                insertedAssets.length > 0
              ) {
                // Notify the app that the media library has changed
                useAppStore.setState({ shouldRefreshMediaLibrary: true });
              }
            },
          );

          // Cleanup subscription on unmount
          return () => {
            subscription.remove();
          };
        }
      } catch (error) {
        console.error("Error requesting media permissions:", error);
        setHasMediaPermission(false);
      }
    }

    void initializeMediaPermissions();
  }, [setHasMediaPermission]);
}
