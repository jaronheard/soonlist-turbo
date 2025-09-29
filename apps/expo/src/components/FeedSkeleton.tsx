import type { DimensionValue } from "react-native";
import React from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { CloudOff } from "~/components/icons";

export default function FeedSkeleton() {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const SkeletonBox = ({
    width,
    height,
  }: {
    width: DimensionValue;
    height: number;
  }) => (
    <Animated.View
      style={[
        animatedStyle,
        {
          width,
          height,
          backgroundColor: "#e5e7eb", // gray-200
          borderRadius: 4,
        },
      ]}
    />
  );

  return (
    <View className="flex-1 bg-white px-4">
      {/* Offline indicator */}
      <View className="absolute bottom-8 left-4 z-10 rounded-full bg-neutral-1 p-2">
        <CloudOff size={16} color="#FFF" strokeWidth={3} />
      </View>

      {/* Stats card skeleton */}
      <View className="mb-4 mt-6 rounded-lg bg-gray-50 p-4">
        <SkeletonBox width="60%" height={24} />
        <View className="mt-3 flex-row justify-between">
          <SkeletonBox width="30%" height={40} />
          <SkeletonBox width="30%" height={40} />
          <SkeletonBox width="30%" height={40} />
        </View>
      </View>

      {/* Event cards skeleton */}
      {[1, 2, 3, 4].map((i) => (
        <View key={i} className="mb-4 rounded-lg bg-gray-50 p-4">
          {/* Image placeholder */}
          <SkeletonBox width="100%" height={200} />

          {/* Title */}
          <View className="mt-3">
            <SkeletonBox width="80%" height={20} />
          </View>

          {/* Date and location */}
          <View className="mt-2 space-y-2">
            <SkeletonBox width="60%" height={16} />
            <SkeletonBox width="50%" height={16} />
          </View>

          {/* Action buttons */}
          <View className="mt-3 flex-row justify-between">
            <SkeletonBox width="45%" height={36} />
            <SkeletonBox width="45%" height={36} />
          </View>
        </View>
      ))}
    </View>
  );
}
