import React, { useCallback } from "react";
import { TouchableOpacity, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";

import { useAppStore } from "~/store";

export default function AddEventButton() {
  const { hasMediaPermission } = useAppStore();

  const handlePress = useCallback(async () => {
    // If we already have any level of permission (full or partial), just navigate
    if (hasMediaPermission) {
      router.push("/new");
      return;
    }

    // Only request permissions if we don't have any access yet
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      useAppStore.setState({
        hasMediaPermission: status === MediaLibrary.PermissionStatus.GRANTED,
      });
      router.push("/new");
    } catch (error) {
      console.error("Error requesting media permissions:", error);
      router.push("/new");
    }
  }, [router, hasMediaPermission]);

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
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex-row items-center justify-center gap-2 rounded-full bg-interactive-2 p-6 shadow-lg"
      >
        <Plus size={28} color="#5A32FB" />
      </TouchableOpacity>
    </View>
  );
}
