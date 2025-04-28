import { useEffect, useState } from "react";
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

// Define pagination parameters
export interface PhotoPaginationParams {
  first: number;
  after?: string;
}

// Default pagination values
const INITIAL_BATCH_SIZE = 15;
const ADDITIONAL_BATCH_SIZE = 30;

// The core query function
async function fetchRecentPhotosQueryFn(
  paginationParams?: PhotoPaginationParams,
): Promise<{ photos: PhotoAsset[]; hasNextPage: boolean; endCursor: string | undefined } | null> {
  const startTime = Date.now();
  const batchSize = paginationParams?.first || INITIAL_BATCH_SIZE;
  const after = paginationParams?.after;
  
  logDebug(`[fetchRecentPhotosQueryFn] Starting query with batch size ${batchSize}${after ? ` after ${after}` : ''}`);

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
    const { assets, hasNextPage, endCursor } = await MediaLibrary.getAssetsAsync({
      first: batchSize,
      after,
      sortBy: MediaLibrary.SortBy.creationTime,
      mediaType: [MediaLibrary.MediaType.photo],
    });
    const assetsTime = Date.now();
    logDebug(
      `[fetchRecentPhotosQueryFn] Got assets in ${assetsTime - startTime}ms`,
    );

    if (assets.length === 0) {
      logDebug("[fetchRecentPhotosQueryFn] No photos found");
      return { photos: [], hasNextPage: false, endCursor: undefined };
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
      const isRejected = result.status === "rejected";
      const photoId = photos[index]?.id ?? "unknown"; // Get photo ID safely

      if (isRejected) {
        // Log the rejection reason
        logDebug(
          `[fetchRecentPhotosQueryFn] Failed to prefetch image ${photoId} (Rejected)`,
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          { error: result.reason as unknown }, // Cast reason to unknown
        );
      }
    });
    const prefetchTime = Date.now();
    logDebug(
      `[fetchRecentPhotosQueryFn] Prefetched photos in ${prefetchTime - photosTime}ms`,
    );

    const totalTime = Date.now() - startTime;
    logDebug(
      `[fetchRecentPhotosQueryFn] Finished query for ${photos.length} photos in ${totalTime}ms, hasNextPage: ${hasNextPage}`,
    );

    return { photos, hasNextPage, endCursor };
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
  const hasFullPhotoAccess = useAppStore((s) => s.hasFullPhotoAccess);
  
  // State for pagination
  const [paginationState, setPaginationState] = useState<{
    allPhotos: PhotoAsset[];
    hasNextPage: boolean;
    endCursor?: string;
    isLoadingMore: boolean;
  }>({
    allPhotos: [],
    hasNextPage: true,
    endCursor: undefined,
    isLoadingMore: false,
  });

  const { data, isSuccess, isLoading, ...queryRest } = useQuery({
    queryKey: [...recentPhotosQueryKey, { after: undefined }],
    queryFn: () => fetchRecentPhotosQueryFn(),
    // Enable the query automatically only if FULL permissions are granted initially
    // It will still be manually fetchable with limited permissions via refetch()
    enabled: hasFullPhotoAccess,
  });

  // Update Zustand store when query is successful
  useEffect(() => {
    if (isSuccess && data) {
      const { photos, hasNextPage, endCursor } = data;
      setPaginationState({
        allPhotos: photos,
        hasNextPage,
        endCursor,
        isLoadingMore: false,
      });
      useAppStore.setState({ recentPhotos: photos });
      logDebug("[useRecentPhotos] Updated Zustand store with recent photos");
    } else if (isSuccess && data === null) {
      setPaginationState({
        allPhotos: [],
        hasNextPage: false,
        endCursor: undefined,
        isLoadingMore: false,
      });
      useAppStore.setState({ recentPhotos: [] });
      logDebug(
        "[useRecentPhotos] Cleared recent photos in Zustand store due to null data (likely permissions)",
      );
    }
  }, [data, isSuccess]);

  // Function to load more photos
  const loadMorePhotos = async () => {
    if (!paginationState.hasNextPage || paginationState.isLoadingMore || !hasMediaPermission) {
      return;
    }

    try {
      setPaginationState(prev => ({ ...prev, isLoadingMore: true }));
      logDebug("[useRecentPhotos] Loading more photos");

      const result = await fetchRecentPhotosQueryFn({
        first: ADDITIONAL_BATCH_SIZE,
        after: paginationState.endCursor,
      });

      if (result) {
        const { photos, hasNextPage, endCursor } = result;
        const newAllPhotos = [...paginationState.allPhotos, ...photos];
        
        setPaginationState({
          allPhotos: newAllPhotos,
          hasNextPage,
          endCursor,
          isLoadingMore: false,
        });
        
        // Update the store with all photos
        useAppStore.setState({ recentPhotos: newAllPhotos });
        logDebug(`[useRecentPhotos] Added ${photos.length} more photos, total: ${newAllPhotos.length}`);
      }
    } catch (error) {
      logError("[useRecentPhotos] Error loading more photos", error);
      setPaginationState(prev => ({ ...prev, isLoadingMore: false }));
    }
  };

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
            exact: false, // Invalidate all photo queries
          });
          
          // Reset pagination state
          setPaginationState({
            allPhotos: [],
            hasNextPage: true,
            endCursor: undefined,
            isLoadingMore: false,
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
  return { 
    data: paginationState.allPhotos, 
    isSuccess, 
    isLoading,
    isLoadingMore: paginationState.isLoadingMore,
    hasNextPage: paginationState.hasNextPage,
    loadMorePhotos,
    ...queryRest, 
    queryClient 
  };
}
