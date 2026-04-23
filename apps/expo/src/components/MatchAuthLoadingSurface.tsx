import React from "react";
import { View } from "react-native";

import LoadingSpinner from "./LoadingSpinner";

export function MatchAuthLoadingSurface() {
  return (
    <View className="flex-1 bg-interactive-3">
      <View className="h-[100px]" />
      <LoadingSpinner />
    </View>
  );
}
