import { useEffect } from "react";
import * as MediaLibrary from "expo-media-library";

import { useAppStore } from "~/store";

export function useMediaPermissions() {
  const { setHasMediaPermission, setRecentPhotos } = useAppStore();

  useEffect(() => {
    let subscription: MediaLibrary.Subscription | undefined;

    async function checkPermissionsAndSubscribe() {
      const { status, accessPrivileges } =
        await MediaLibrary.getPermissionsAsync();
      const isGranted = status === MediaLibrary.PermissionStatus.GRANTED;
      const hasFullAccess = accessPrivileges === "all";

      useAppStore.setState({
        hasMediaPermission: isGranted,
        hasFullPhotoAccess: hasFullAccess,
      });

      if (isGranted) {
        // Set up subscription for permission changes
        subscription = MediaLibrary.addListener(({ hasIncrementalChanges }) => {
          if (hasIncrementalChanges) {
            void checkPermissionsAndSubscribe();
          }
        });
      }
    }

    void checkPermissionsAndSubscribe();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [setHasMediaPermission, setRecentPhotos]);
}
