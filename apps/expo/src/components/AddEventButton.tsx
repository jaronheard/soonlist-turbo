import React, { useCallback } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";

import { useAppStore } from "~/store";
import { showToast } from "~/utils/toast";

export default function AddEventButton() {
  const router = useRouter();
  const {
    hasMediaPermission,
    setRecentPhotos,
    recentPhotos,
    isLoadingPhotos,
    setIsLoadingPhotos,
    setPhotoLoadingError,
  } = useAppStore();

  const handlePress = useCallback(async () => {
    if (!hasMediaPermission) {
      showToast("Photo access is needed to add photos to events", "error");
      router.push("/new");
      return;
    }

    if (recentPhotos.length === 0) {
      try {
        setIsLoadingPhotos(true);
        setPhotoLoadingError(null);

        const { assets } = await MediaLibrary.getAssetsAsync({
          first: 100,
          mediaType: MediaLibrary.MediaType.photo,
          sortBy: [MediaLibrary.SortBy.creationTime],
        });

        const photos = assets.map((asset) => ({
          id: asset.id,
          uri: asset.uri,
        }));

        setRecentPhotos(photos);
      } catch (error) {
        console.error("Error loading recent photos:", error);
        setPhotoLoadingError("Failed to load photos");
        showToast("Unable to load recent photos", "error");
      } finally {
        setIsLoadingPhotos(false);
      }
    }

    router.push("/new");
  }, [
    hasMediaPermission,
    recentPhotos.length,
    setRecentPhotos,
    router,
    setIsLoadingPhotos,
    setPhotoLoadingError,
  ]);

  return (
    <View className="absolute bottom-0 left-0 right-0">
      <View className="absolute bottom-0 h-24 w-full">
        <BlurView
          intensity={10}
          className="h-full w-full opacity-20"
          tint="light"
        />
      </View>

      <View className="absolute bottom-0 h-40 w-full">
        <LinearGradient
          colors={["transparent", "#5A32FB"]}
          locations={[0, 1]}
          style={{
            position: "absolute",
            height: "100%",
            width: "100%",
            opacity: 0.3,
          }}
        />
        <LinearGradient
          colors={["transparent", "#E0D9FF"]}
          locations={[0, 1]}
          style={{
            position: "absolute",
            height: "100%",
            width: "100%",
            opacity: 0.1,
          }}
        />
      </View>

      <TouchableOpacity
        onPress={handlePress}
        disabled={isLoadingPhotos}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex-row items-center justify-center gap-2 rounded-full bg-interactive-2 p-6 shadow-lg"
      >
        {isLoadingPhotos ? (
          <ActivityIndicator size="small" color="#5A32FB" />
        ) : (
          <Plus size={28} color="#5A32FB" />
        )}
      </TouchableOpacity>
    </View>
  );
}
