import { useCallback, useEffect } from "react";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { useFocusEffect } from "expo-router";

import { useAppStore } from "~/store";

export function useMediaLibrary() {
  const {
    setRecentPhotos,
    shouldRefreshMediaLibrary,
    setShouldRefreshMediaLibrary,
  } = useAppStore();

  // Reusable function to load the most recent photos
  const loadRecentPhotos = useCallback(async () => {
    try {
      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 15,
        sortBy: MediaLibrary.SortBy.creationTime,
        mediaType: [MediaLibrary.MediaType.photo],
      });
      const photos = assets.map((asset) => ({
        id: asset.id,
        uri: asset.uri,
      }));

      // Prefetch all photos in parallel
      await Promise.all(photos.map((photo) => Image.prefetch(photo.uri)));

      setRecentPhotos(photos);
    } catch (error) {
      console.error("Error loading recent photos:", error);
    }
  }, [setRecentPhotos]);

  // Use focus effect to check permissions and add a subscription listener
  useFocusEffect(
    useCallback(() => {
      let subscription: MediaLibrary.Subscription | undefined;

      async function checkPermissionsAndLoadPhotos() {
        const { status, accessPrivileges } =
          await MediaLibrary.getPermissionsAsync();
        const isGranted = status === MediaLibrary.PermissionStatus.GRANTED;
        const hasFullAccess = accessPrivileges === "all";

        useAppStore.setState({
          hasMediaPermission: isGranted,
          hasFullPhotoAccess: hasFullAccess,
        });

        if (isGranted) {
          try {
            await loadRecentPhotos();

            // Listen for changes in the photo library
            subscription = MediaLibrary.addListener(() => {
              useAppStore.setState({ shouldRefreshMediaLibrary: true });
            });
          } catch (error) {
            console.error("Error loading recent photos:", error);
          }
        } else {
          console.log("No media permission, skipping load");
        }
      }

      void checkPermissionsAndLoadPhotos();

      return () => {
        if (subscription) {
          subscription.remove();
        }
      };
    }, [loadRecentPhotos]),
  );

  // Whenever shouldRefreshMediaLibrary is set, load photos and reset the flag
  useEffect(() => {
    if (shouldRefreshMediaLibrary) {
      void loadRecentPhotos();
      setShouldRefreshMediaLibrary(false);
    }
  }, [
    shouldRefreshMediaLibrary,
    setShouldRefreshMediaLibrary,
    loadRecentPhotos,
  ]);

  return { loadRecentPhotos };
}
