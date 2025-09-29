import React from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export default function FeedSkeleton() {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800 }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const SkeletonBox = ({
    width,
    height,
  }: {
    width: string | number;
    height: number;
  }) => (
    <Animated.View
      style={[animatedStyle]}
      className="bg-gray-200 rounded"
      // @ts-expect-error - width can be string or number
      // eslint-disable-next-line react-native/no-inline-styles
      style={{ width, height }}
    />
  );

  return (
    <View className="flex-1 bg-white px-4">
      {/* Stats card skeleton */}
      <View className="mt-6 mb-4 p-4 bg-gray-50 rounded-lg">
        <SkeletonBox width="60%" height={24} />
        <View className="flex-row justify-between mt-3">
          <SkeletonBox width="30%" height={40} />
          <SkeletonBox width="30%" height={40} />
          <SkeletonBox width="30%" height={40} />
        </View>
      </View>

      {/* Event cards skeleton */}
      {[1, 2, 3, 4].map((i) => (
        <View key={i} className="mb-4 p-4 bg-gray-50 rounded-lg">
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
          <View className="flex-row justify-between mt-3">
            <SkeletonBox width="45%" height={36} />
            <SkeletonBox width="45%" height={36} />
          </View>
        </View>
      ))}
    </View>
  );
}

