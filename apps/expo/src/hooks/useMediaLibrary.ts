import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";

import { useAppStore } from "~/store";

export async function fetchRecentPhotos() {
  const startTime = Date.now();
  console.log("[fetchRecentPhotos] Starting to load recent photos");
  try {
    // First check permissions
    const { status, accessPrivileges } =
      await MediaLibrary.getPermissionsAsync();
    const isGranted = status === MediaLibrary.PermissionStatus.GRANTED;
    const hasFullAccess = accessPrivileges === "all";

    // Update permission state
    useAppStore.setState({
      hasMediaPermission: isGranted,
      hasFullPhotoAccess: hasFullAccess,
    });

    if (!isGranted) {
      console.log("[fetchRecentPhotos] No permission to access media library");
      return null;
    }

    console.log("[fetchRecentPhotos] Getting assets");
    const { assets } = await MediaLibrary.getAssetsAsync({
      first: 15,
      sortBy: MediaLibrary.SortBy.creationTime,
      mediaType: [MediaLibrary.MediaType.photo],
    });
    const assetsTime = Date.now();
    console.log(
      `[fetchRecentPhotos] Got assets in ${assetsTime - startTime}ms`,
    );

    const photos = assets.map((asset) => ({
      id: asset.id,
      uri: asset.uri,
    }));
    const photosTime = Date.now();
    console.log(
      `[fetchRecentPhotos] Got photos in ${photosTime - assetsTime}ms`,
    );

    // Prefetch all photos in parallel
    await Promise.all(photos.map((photo) => Image.prefetch(photo.uri)));
    const prefetchTime = Date.now();
    console.log(
      `[fetchRecentPhotos] Prefetched photos in ${prefetchTime - photosTime}ms`,
    );

    // Save in store
    useAppStore.setState({ recentPhotos: photos });

    const totalTime = Date.now() - startTime;
    console.log(
      `[fetchRecentPhotos] Finished loading ${photos.length} photos in ${totalTime}ms total`,
    );

    return photos;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[fetchRecentPhotos] Error loading recent photos after ${duration}ms total:`,
      error,
    );
    return null;
  }
}
