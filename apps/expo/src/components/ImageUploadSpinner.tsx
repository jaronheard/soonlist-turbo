import React from "react";
import { ActivityIndicator, View } from "react-native";

export default function ImageUploadSpinner() {
  return (
    <View className="items-center justify-center">
      <ActivityIndicator size="small" color="#5A32FB" />
    </View>
  );
}
