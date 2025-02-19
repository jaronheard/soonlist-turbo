import React, { useCallback } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";

import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";

export default function AddEventButton() {
  const { hasMediaPermission } = useAppStore();
  const { customerInfo, showProPaywallIfNeeded } = useRevenueCat();
  const hasUnlimited = customerInfo?.entitlements.active.unlimited;

  const handlePress = useCallback(async () => {
    // If user doesn't have pro, show paywall
    if (!hasUnlimited) {
      await showProPaywallIfNeeded();
      return;
    }

    // Refresh media library before navigating
    useAppStore.setState({ shouldRefreshMediaLibrary: true });

    // If any level of permission is available, just navigate
    if (hasMediaPermission) {
      router.push("/add");
      return;
    }

    // Otherwise request permissions
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      useAppStore.setState({
        hasMediaPermission: status === MediaLibrary.PermissionStatus.GRANTED,
      });
      router.push("/add");
    } catch (error) {
      console.error("Error requesting media permissions:", error);
      router.push("/add");
    }
  }, [hasMediaPermission, hasUnlimited, showProPaywallIfNeeded]);

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
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <View className="relative flex-row items-center justify-center gap-2 rounded-full bg-interactive-2 p-6 shadow-lg">
          <Plus size={28} color="#5A32FB" />
          {!hasUnlimited && (
            <View className="absolute -right-2 -top-2 rounded-full bg-accent-yellow px-2 py-0.5">
              <Text className="text-xs font-semibold text-neutral-1">PRO</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}
