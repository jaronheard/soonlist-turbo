import type { DimensionValue } from "react-native";
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface SkeletonProps {
  width: DimensionValue;
  height: DimensionValue;
  className?: string;
}

function Skeleton({ width, height, className }: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.5, { duration: 1000 }),
      ),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedLinearGradient
      colors={["#E5E7EB", "#F3F4F6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[{ width, height, borderRadius: 4 }, animatedStyle]}
      className={className}
    />
  );
}

export function EventListItemSkeleton() {
  return (
    <View className="relative -mx-2 flex-row items-center rounded-lg border-b border-neutral-3 bg-white p-4 px-6 pt-12">
      {/* Placeholder icons in the top-right area */}
      <View className="absolute right-4 top-2 flex-row items-center gap-2 opacity-60">
        <Skeleton width={24} height={24} className="rounded-full" />
        <Skeleton width={24} height={24} className="rounded-full" />
      </View>

      <View className="mr-4 flex-1">
        {/* Date and time */}
        <Skeleton width={120} height={20} className="mb-2" />

        {/* Title */}
        <Skeleton width="90%" height={28} className="mb-2" />

        {/* Location */}
        <Skeleton width={150} height={20} className="mb-2" />

        {/* Username */}
        <Skeleton width={100} height={20} />
      </View>

      {/* Image placeholder */}
      <Skeleton width={80} height={80} className="rounded-2xl" />
    </View>
  );
}
