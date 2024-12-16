import { useEffect } from "react";
import * as MediaLibrary from "expo-media-library";

import { useAppStore } from "~/store";

interface SmartAlbum {
  id: string;
  title: string;
  type: "smart";
  assetCount: number;
}

interface RegularAlbum {
  id: string;
  title: string;
  type: "regular";
  assetCount: number;
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

        // Create smart albums list
        const smartAlbums: SmartAlbum[] = albums
          .filter((album) => smartAlbumTitles.includes(album.title))
          .map((album) => ({
            id: album.id,
            title: album.title,
            type: "smart",
            assetCount: album.assetCount,
          }));

        // Create regular albums list (excluding smart albums)
        const regularAlbums: RegularAlbum[] = albums
          .filter((album) => !smartAlbumTitles.includes(album.title))
          .map((album) => ({
            id: album.id,
            title: album.title,
            type: "regular",
            assetCount: album.assetCount,
          }));

        // Add "All Albums" as a special smart album
        const allAlbumsEntry: SmartAlbum = {
          id: "all-albums",
          title: "All Albums",
          type: "smart",
          assetCount: regularAlbums.reduce(
            (sum, album) => sum + album.assetCount,
            0,
          ),
        };

        // Combine smart albums with "All Albums" entry
        const formattedAlbums = [...smartAlbums, allAlbumsEntry];

        setAvailableAlbums({
          smartAlbums: formattedAlbums,
          regularAlbums,
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
