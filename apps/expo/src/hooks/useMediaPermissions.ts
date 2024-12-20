import { useEffect } from "react";
import * as MediaLibrary from "expo-media-library";

import { useAppStore } from "~/store";
import { showToast } from "~/utils/toast";

export interface SmartAlbum {
  id: string;
  title: string;
  type: "smart";
  assetCount: number;
}

export interface RegularAlbum {
  id: string;
  title: string;
  type: "regular";
  assetCount: number;
  thumbnail: string | undefined;
}

export function useMediaPermissions() {
  const { setHasMediaPermission, setAvailableAlbums, setSelectedAlbum } =
    useAppStore();

  useEffect(() => {
    let subscription: MediaLibrary.Subscription | undefined;

    async function loadAlbums() {
      try {
        const albums = await MediaLibrary.getAlbumsAsync({
          includeSmartAlbums: true,
        });

        if (!albums.length) {
          showToast("No photo albums found", "info");
          return;
        }

        // Define smart albums we want to show at the top
        const smartAlbumTitles = ["Recents", "Screenshots", "Favorites"];

        // Create smart albums list - filter out empty albums
        const smartAlbums: SmartAlbum[] = albums
          .filter(
            (album) =>
              smartAlbumTitles.includes(album.title) && album.assetCount > 0,
          )
          .map((album) => ({
            id: album.id,
            title: album.title,
            type: "smart",
            assetCount: album.assetCount,
          }));

        // Add error handling for empty smart albums
        if (!smartAlbums.length) {
          showToast("No smart albums available", "info");
        }

        // Optimize regular albums loading with parallel processing
        const regularAlbums = await Promise.allSettled<RegularAlbum | null>(
          albums
            .filter(
              (album) =>
                !smartAlbumTitles.includes(album.title) && album.assetCount > 0,
            )
            .map(async (album) => {
              try {
                const assets = await MediaLibrary.getAssetsAsync({
                  first: 1,
                  album: album,
                  sortBy: MediaLibrary.SortBy.creationTime,
                });

                if (!assets.assets.length) {
                  throw new Error(`No assets found in album: ${album.title}`);
                }

                return {
                  id: album.id,
                  title: album.title,
                  type: "regular" as const,
                  assetCount: album.assetCount,
                  thumbnail: assets.assets[0]?.uri,
                };
              } catch (error) {
                console.error(`Error loading album ${album.title}:`, error);
                return null;
              }
            }),
        );

        // Filter out failed album loads with proper type handling
        const successfulAlbums = regularAlbums
          .filter(
            (result): result is PromiseFulfilledResult<RegularAlbum | null> =>
              result.status === "fulfilled",
          )
          .map((result) => result.value)
          .filter((album): album is RegularAlbum => album !== null);

        // Add "All Albums" as a special smart album only if there are regular albums with content
        const allAlbumsEntry: SmartAlbum | null =
          successfulAlbums.length > 0 &&
          successfulAlbums.some((album) => album.assetCount > 0)
            ? {
                id: "all-albums",
                title: "All Albums",
                type: "smart",
                assetCount: successfulAlbums.reduce(
                  (sum, album) => sum + album.assetCount,
                  0,
                ),
              }
            : null;

        // Combine smart albums with "All Albums" entry if it exists
        const formattedAlbums = allAlbumsEntry
          ? [...smartAlbums, allAlbumsEntry]
          : smartAlbums;

        setAvailableAlbums({
          smartAlbums: formattedAlbums,
          regularAlbums: successfulAlbums.sort(
            (a, b) => b.assetCount - a.assetCount,
          ),
        });

        // Set "Recents" as default album with error handling
        const recentsAlbum = smartAlbums.find(
          (album) => album.title === "Recents",
        );
        if (recentsAlbum) {
          setSelectedAlbum(recentsAlbum);
        } else {
          showToast("Recents album not available", "error");
        }
      } catch (error) {
        console.error("Error loading albums:", error);
        showToast("Failed to load photo albums", "error");
      }
    }

    async function initializeMediaPermissions() {
      try {
        const { status, canAskAgain } =
          await MediaLibrary.requestPermissionsAsync();
        const isGranted = status === MediaLibrary.PermissionStatus.GRANTED;
        setHasMediaPermission(isGranted);

        if (isGranted) {
          await loadAlbums();

          subscription = MediaLibrary.addListener(
            ({ hasIncrementalChanges, insertedAssets }) => {
              if (
                hasIncrementalChanges &&
                insertedAssets &&
                insertedAssets.length > 0
              ) {
                useAppStore.setState({ shouldRefreshMediaLibrary: true });
                void loadAlbums();
              }
            },
          );
        } else {
          const message = canAskAgain
            ? "Photo access denied. Please grant permission in settings."
            : "Photo access permanently denied. Update permissions in system settings.";
          showToast(message, "error");
        }
      } catch (error) {
        console.error("Error requesting media permissions:", error);
        showToast("Failed to request photo permissions", "error");
        setHasMediaPermission(false);
      }
    }

    void initializeMediaPermissions();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [setHasMediaPermission, setAvailableAlbums, setSelectedAlbum]);
}
