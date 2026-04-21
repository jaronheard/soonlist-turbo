import React from "react";
import { View } from "react-native";

import LoadingSpinner from "./LoadingSpinner";

/**
 * Same static layout as {@link AuthLoading} on tab screens: large-title offset,
 * then centered {@link LoadingSpinner} on bg-interactive-3.
 */
export function MatchAuthLoadingSurface() {
  return (
    <View className="flex-1 bg-interactive-3">
      <View className="h-[100px]" />
      <LoadingSpinner />
    </View>
  );
}
