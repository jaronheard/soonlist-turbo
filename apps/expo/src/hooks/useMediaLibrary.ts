import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";

import { useAppStore } from "~/store";
import { logDebug, logError } from "~/utils/errorLogging";

export async function fetchRecentPhotos() {
  const startTime = Date.now();
  logDebug("[fetchRecentPhotos] Starting to load recent photos");
  let isGranted = false;
  let hasFullAccess = false;

  try {
    // First check permissions
    const { status, accessPrivileges } =
      await MediaLibrary.getPermissionsAsync();
    isGranted = status === MediaLibrary.PermissionStatus.GRANTED;
    hasFullAccess = accessPrivileges === "all";

    // Update permission state
    useAppStore.setState({
      hasMediaPermission: isGranted,
      hasFullPhotoAccess: hasFullAccess,
    });

    if (!isGranted) {
      logDebug("[fetchRecentPhotos] No permission to access media library");
      return null;
    }

    logDebug("[fetchRecentPhotos] Getting assets");
    const { assets } = await MediaLibrary.getAssetsAsync({
      first: 15,
      sortBy: MediaLibrary.SortBy.creationTime,
      mediaType: [MediaLibrary.MediaType.photo],
    });
    const assetsTime = Date.now();
    logDebug(`[fetchRecentPhotos] Got assets in ${assetsTime - startTime}ms`);

    const photos = assets.map((asset) => ({
      id: asset.id,
      uri: asset.uri,
    }));
    const photosTime = Date.now();
    logDebug(`[fetchRecentPhotos] Got photos in ${photosTime - assetsTime}ms`);

    // Prefetch all photos in parallel
    await Promise.all(photos.map((photo) => Image.prefetch(photo.uri)));
    const prefetchTime = Date.now();
    logDebug(
      `[fetchRecentPhotos] Prefetched photos in ${prefetchTime - photosTime}ms`,
    );

    // Save in store
    useAppStore.setState({ recentPhotos: photos });

    const totalTime = Date.now() - startTime;
    logDebug(
      `[fetchRecentPhotos] Finished loading ${photos.length} photos in ${totalTime}ms total`,
    );

    return photos;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(
      `[fetchRecentPhotos] Error loading recent photos after ${duration}ms total. Permission state: isGranted=${isGranted}, hasFullAccess=${hasFullAccess}`,
      error,
    );
    return null;
  }
}
