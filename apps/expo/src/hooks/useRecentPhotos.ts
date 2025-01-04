// apps/expo/src/hooks/useRecentPhotos.ts
import { useEffect } from "react";
import * as MediaLibrary from "expo-media-library";

import { useAppStore } from "~/store";

export function useRecentPhotos() {
  useEffect(() => {
    let subscription: MediaLibrary.Subscription | undefined;

    async function loadPhotos() {
      const { status, accessPrivileges } =
        await MediaLibrary.getPermissionsAsync();
      if (status === MediaLibrary.PermissionStatus.GRANTED) {
        const hasFullAccess = accessPrivileges === "all";

        useAppStore.setState({
          hasMediaPermission: true,
          hasFullPhotoAccess: hasFullAccess,
        });

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
              } catch {
                return null;
              }
            }),
          );

          const recent = accessibleAssets.filter(Boolean);
          useAppStore.setState({
            recentPhotos: recent.filter((photo): photo is { id: string; uri: string } => photo !== null),
            shouldRefreshMediaLibrary: false,
          });

          subscription = MediaLibrary.addListener(
            ({ hasIncrementalChanges, insertedAssets }) => {
              if (hasIncrementalChanges && insertedAssets?.length) {
                // Option A: fetch everything again
                void loadPhotos();
                // Or Option B: fetch just the newly inserted assets and merge them
              }
            },
          );
        } catch (err) {
          console.error("Error loading photos:", err);
        }
      }
    }

    // Initially fetch photos
    void loadPhotos();

    return () => {
      subscription?.remove();
    };
  }, []);
}
