import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

export function InFlightEventOverlay() {
  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      className="absolute left-0 right-0 top-28 z-50 flex-row items-center justify-center gap-2 px-4 py-2"
    >
      <View
        className="overflow-hidden rounded-3xl bg-interactive-2 px-6 py-3"
        style={{
          borderWidth: 3,
          borderColor: "white",
          shadowColor: "#5A32FB",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 2.5,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#5A32FB" />
          <Text className="text-small font-bold text-interactive-1">
            Capturing...
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
