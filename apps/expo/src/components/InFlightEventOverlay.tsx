import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

export function InFlightEventOverlay() {
  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      className="absolute left-0 right-0 top-32 z-50 flex-row items-center justify-center gap-2 px-4 py-2"
    >
      <View className="flex-row items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-lg">
        <ActivityIndicator size="small" color="#5A32FB" />
        <Text className="text-base font-bold text-[#5A32FB]">Capturing...</Text>
      </View>
    </Animated.View>
  );
}
