import { useEffect } from "react";
import * as MediaLibrary from "expo-media-library";

import { useAppStore } from "~/store";

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
        // Filter to only include specific smart albums
        const allowedSmartAlbums = [
          "All Photos",
          "Recents",
          "Screenshots",
          "Camera Roll",
        ];
        const filteredAlbums = albums.filter((album) =>
          allowedSmartAlbums.includes(album.title),
        );
        const formattedAlbums = filteredAlbums.map((album) => ({
          id: album.id,
          title: album.title,
          assetCount: album.assetCount,
        }));

        setAvailableAlbums(formattedAlbums);

        // Set "All Photos" as default album
        const allPhotosAlbum = formattedAlbums.find(
          (album) =>
            album.title === "All Photos" || album.title === "Camera Roll",
        );
        if (allPhotosAlbum) {
          setSelectedAlbum(allPhotosAlbum);
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
                // Reload albums when media library changes
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
