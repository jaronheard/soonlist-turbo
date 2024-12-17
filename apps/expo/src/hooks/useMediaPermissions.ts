import { useEffect } from "react";
import * as MediaLibrary from "expo-media-library";

import { useAppStore } from "~/store";

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
  thumbnail?: string;
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

        // Optimize regular albums loading with parallel processing
        const regularAlbums = await Promise.all(
          albums
            .filter(
              (album) =>
                !smartAlbumTitles.includes(album.title) && album.assetCount > 0,
            )
            .map(async (album) => {
              const assets = await MediaLibrary.getAssetsAsync({
                first: 1,
                album: album,
                sortBy: MediaLibrary.SortBy.creationTime,
              });

              return {
                id: album.id,
                title: album.title,
                type: "regular" as const,
                assetCount: album.assetCount,
                thumbnail: assets.assets[0]?.uri,
              };
            }),
        );

        // Add "All Albums" as a special smart album only if there are regular albums with content
        const allAlbumsEntry: SmartAlbum | null =
          regularAlbums.length > 0 &&
          regularAlbums.some((album) => album.assetCount > 0)
            ? {
                id: "all-albums",
                title: "All Albums",
                type: "smart",
                assetCount: regularAlbums.reduce(
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
          regularAlbums: regularAlbums.sort(
            (a, b) => b.assetCount - a.assetCount,
          ),
        });

        // Set "Recents" as default album
        const recentsAlbum = smartAlbums.find(
          (album) => album.title === "Recents",
        );
        if (recentsAlbum) {
          setSelectedAlbum(recentsAlbum);
        }
      } catch (error) {
        console.error("Error loading albums:", error);
      }
    }

    async function initializeMediaPermissions() {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
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
        }
      } catch (error) {
        console.error("Error requesting media permissions:", error);
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
