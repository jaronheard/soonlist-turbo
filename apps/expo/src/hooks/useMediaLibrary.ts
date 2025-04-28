import { useEffect } from "react";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAppStore } from "~/store";
import { logDebug, logError } from "~/utils/errorLogging";

// Define the query key
export const recentPhotosQueryKey = ["recentPhotos"];

interface PhotoAsset {
  id: string;
  uri: string;
}

// The core query function
async function fetchRecentPhotosQueryFn(): Promise<PhotoAsset[] | null> {
  const startTime = Date.now();
  logDebug("[fetchRecentPhotosQueryFn] Starting query");

  try {
    // Check permissions directly within the query function
    const { status, accessPrivileges } =
      await MediaLibrary.getPermissionsAsync();
    // Allow proceeding if granted or limited access
    const canAccessMedia =
      status === MediaLibrary.PermissionStatus.GRANTED ||
      accessPrivileges === "limited";

    if (!canAccessMedia) {
      logDebug(
        "[fetchRecentPhotosQueryFn] No permission to access media library (status: " +
          status +
          ", access: " +
          accessPrivileges +
          ")",
      );
      // Return null or empty array if no permission, Tanstack Query will handle this state
      return null;
    }

    logDebug("[fetchRecentPhotosQueryFn] Getting assets");
    const { assets } = await MediaLibrary.getAssetsAsync({
      first: 15, // Fetch a reasonable number for the "recent" context
      sortBy: MediaLibrary.SortBy.creationTime,
      mediaType: [MediaLibrary.MediaType.photo],
    });
    const assetsTime = Date.now();
    logDebug(
      `[fetchRecentPhotosQueryFn] Got assets in ${assetsTime - startTime}ms`,
    );

    if (assets.length === 0) {
      logDebug("[fetchRecentPhotosQueryFn] No photos found");
      return [];
    }

    const photos: PhotoAsset[] = assets.map((asset) => ({
      id: asset.id,
      uri: asset.uri,
    }));
    const photosTime = Date.now();
    logDebug(
      `[fetchRecentPhotosQueryFn] Mapped photos in ${photosTime - assetsTime}ms`,
    );

    // Prefetch all photos in parallel, handling individual failures
    const prefetchResults = await Promise.allSettled(
      photos.map((photo) => Image.prefetch(photo.uri)),
    );
    prefetchResults.forEach((result, index) => {
      if (result.status === "rejected") {
        logDebug(
          `[fetchRecentPhotosQueryFn] Failed to prefetch image ${photos[index]?.id}: ${result.reason}`,
        );
      }
    });
    const prefetchTime = Date.now();
    logDebug(
      `[fetchRecentPhotosQueryFn] Prefetched photos in ${prefetchTime - photosTime}ms`,
    );

    const totalTime = Date.now() - startTime;
    logDebug(
      `[fetchRecentPhotosQueryFn] Finished query for ${photos.length} photos in ${totalTime}ms`,
    );

    return photos;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(
      `[fetchRecentPhotosQueryFn] Error loading recent photos after ${duration}ms`,
      error,
    );
    // Throw error so Tanstack Query catches it
    throw error;
  }
}

// The Tanstack Query hook
export function useRecentPhotos() {
  const queryClient = useQueryClient();
  // Read permission status once per render
  const hasMediaPermission = useAppStore((s) => s.hasMediaPermission);

  const { data, isSuccess, ...queryRest } = useQuery({
    queryKey: recentPhotosQueryKey,
    queryFn: fetchRecentPhotosQueryFn,
    // Enable the query only if permissions are granted initially
    // It will be re-enabled automatically if permissions change and the hook reruns
    enabled: hasMediaPermission,
  });

  // Update Zustand store when query is successful
  useEffect(() => {
    if (isSuccess && data) {
      useAppStore.setState({ recentPhotos: data });
      logDebug("[useRecentPhotos] Updated Zustand store with recent photos");
    } else if (isSuccess && data === null) {
      useAppStore.setState({ recentPhotos: [] });
      logDebug(
        "[useRecentPhotos] Cleared recent photos in Zustand store due to null data (likely permissions)",
      );
    }
  }, [data, isSuccess]);

  // Effect to listen for media library changes and invalidate query
  useEffect(() => {
    let subscription: MediaLibrary.Subscription | undefined;

    // Use the stable 'hasMediaPermission' value read at the hook's top level
    if (hasMediaPermission) {
      logDebug("[useRecentPhotos] Subscribing to media library updates");
      subscription = MediaLibrary.addListener(({ hasIncrementalChanges }) => {
        if (hasIncrementalChanges) {
          logDebug(
            "[useRecentPhotos] Media library changed, invalidating photos query",
          );
          void queryClient.invalidateQueries({
            queryKey: recentPhotosQueryKey,
            exact: true, // Ensure only this exact query is invalidated
          });
        }
      });
    } else {
      logDebug(
        "[useRecentPhotos] Skipping media library subscription (no permission)",
      );
    }

    return () => {
      if (subscription) {
        logDebug("[useRecentPhotos] Unsubscribing from media library updates");
        subscription.remove();
      }
    };
    // Depend on the queryClient and the permission status read from the store
  }, [queryClient, hasMediaPermission]);

  // Return the query result and client for potential direct interaction
  return { data, isSuccess, ...queryRest, queryClient };
}
