import React from "react";
import { ActivityIndicator, View } from "react-native";

interface LoadingSpinnerProps {
  color?:
    | "purple"
    | "blue"
    | "green"
    | "red"
    | "orange"
    | "pink"
    | "gray"
    | "black"
    | "white";
}

const colorMap = {
  purple: "#5A32FB",
  blue: "#3B82F6",
  green: "#10B981",
  red: "#EF4444",
  orange: "#F97316",
  pink: "#EC4899",
  gray: "#6B7280",
  black: "#000000",
  white: "#FFFFFF",
};

export default function LoadingSpinner({
  color = "purple",
}: LoadingSpinnerProps) {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color={colorMap[color]} />
    </View>
  );
}
