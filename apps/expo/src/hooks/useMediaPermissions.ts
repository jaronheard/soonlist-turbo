import { useEffect } from "react";
import * as MediaLibrary from "expo-media-library";
import { toast } from "sonner-native";

import { useAppStore } from "~/store";

export function useMediaPermissions() {
  const { setHasMediaPermission } = useAppStore();

  useEffect(() => {
    let subscription: MediaLibrary.Subscription | undefined;

    async function subscribeIfGranted() {
      // Only subscribe if permissions have already been granted
      const { status } = await MediaLibrary.getPermissionsAsync();
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
    }

    void subscribeIfGranted();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [setHasMediaPermission]);
}
