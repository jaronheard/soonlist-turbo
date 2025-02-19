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
    const startTime = Date.now();
    console.log("[loadRecentPhotos] Starting to load recent photos");
    try {
      console.log("[loadRecentPhotos] Getting assets");
      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 15,
        sortBy: MediaLibrary.SortBy.creationTime,
        mediaType: [MediaLibrary.MediaType.photo],
        // createdAfter: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      });
      const assetsTime = Date.now();
      console.log(
        `[loadRecentPhotos] Got assets in ${assetsTime - startTime}ms`,
      );

      const photos = assets.map((asset) => ({
        id: asset.id,
        uri: asset.uri,
      }));
      const photosTime = Date.now();
      console.log(
        `[loadRecentPhotos] Got photos in ${photosTime - assetsTime}ms`,
      );

      // Prefetch all photos in parallel
      await Promise.all(photos.map((photo) => Image.prefetch(photo.uri)));
      const prefetchTime = Date.now();
      console.log(
        `[loadRecentPhotos] Prefetched photos in ${prefetchTime - photosTime}ms`,
      );
      setRecentPhotos(photos);
      const totalTime = Date.now() - startTime;
      console.log(
        `[loadRecentPhotos] Finished loading ${photos.length} photos in ${totalTime}ms total`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[loadRecentPhotos] Error loading recent photos after ${duration}ms total:`,
        error,
      );
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
      console.log("[useMediaLibrary] shouldRefreshMediaLibrary is true");
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
