import React, { useCallback } from "react";
import { TouchableOpacity, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import { Plus } from "lucide-react-native";

import { useAppStore } from "~/store";

interface AddEventButtonProps {
  onPress: () => void;
}

const AddEventButton: React.FC<AddEventButtonProps> = ({ onPress }) => {
  const { hasMediaPermission, setRecentPhotos, recentPhotos } = useAppStore();

  const handlePress = useCallback(async () => {
    // Only load photos if we don't already have them
    if (hasMediaPermission && recentPhotos.length === 0) {
      try {
        console.log("📸 Loading recent photos...");
        const { assets } = await MediaLibrary.getAssetsAsync({
          first: 100,
          mediaType: MediaLibrary.MediaType.photo,
          sortBy: [MediaLibrary.SortBy.creationTime],
        });

        const photos = assets.map((asset) => ({
          id: asset.id,
          uri: asset.uri,
        }));

        console.log(`📸 Loaded ${photos.length} recent photos`);
        setRecentPhotos(photos);
      } catch (error) {
        console.error("📸 Error loading recent photos:", error);
      }
    }

    // Call the original onPress handler
    onPress();
  }, [hasMediaPermission, onPress, recentPhotos.length, setRecentPhotos]);

  return (
    <View className="absolute bottom-0 left-0 right-0">
      {/* Bottom blur (stronger) */}
      <View className="absolute bottom-0 h-24 w-full">
        <BlurView
          intensity={10}
          className="h-full w-full opacity-20"
          tint="light"
        />
      </View>

      {/* Top blur (lighter) with fade out */}
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

      {/* Button */}
      <TouchableOpacity
        onPress={handlePress}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex-row items-center justify-center gap-2 rounded-full bg-interactive-2 p-6 shadow-lg"
      >
        <Plus size={28} color="#5A32FB" />
      </TouchableOpacity>
    </View>
  );
};

export default AddEventButton;
