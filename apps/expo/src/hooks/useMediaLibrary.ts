import { useCallback, useEffect } from "react";
import * as MediaLibrary from "expo-media-library";
import { useFocusEffect } from "expo-router";

import type { RecentPhoto } from "~/store";
import { useAppStore } from "~/store";

export function useMediaLibrary() {
  const {
    setRecentPhotos,
    shouldRefreshMediaLibrary,
    setShouldRefreshMediaLibrary,
  } = useAppStore();

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
      setRecentPhotos(photos);
    } catch (error) {
      console.error("Error loading recent photos:", error);
    }
  }, [setRecentPhotos]);

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
            const { assets } = await MediaLibrary.getAssetsAsync({
              first: 15,
              sortBy: MediaLibrary.SortBy.creationTime,
              mediaType: [MediaLibrary.MediaType.photo],
            });

            const accessibleAssets = await Promise.all(
              assets.map(async (asset) => {
                try {
                  const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
                  return assetInfo.localUri
                    ? { id: asset.id, uri: assetInfo.localUri }
                    : null;
                } catch (e) {
                  return null;
                }
              }),
            );
            const photos = accessibleAssets.filter(
              (asset): asset is RecentPhoto => asset !== null,
            );
            setRecentPhotos(photos);

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
    }, [setRecentPhotos]),
  );

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
