import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

interface CircularSpinnerProps {
  size: number;
  strokeWidth: number;
  color: string;
  duration?: number; // Optional duration for one full rotation in ms
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function CircularSpinner({
  size,
  strokeWidth,
  color,
  duration = 1000,
}: CircularSpinnerProps) {
  const gradientId = React.useMemo(
    () => `spinnerGradient-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.25; // 25 % of the circle
  const strokeDasharray = `${arcLength} ${circumference}`;

  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration, easing: Easing.linear }),
      -1, // Infinite repeats
      false, // Don't reverse
    );
    return () => {
      rotation.value = 0; // Cancel animation on cleanup
    };
  }, [duration, rotation]); // Rerun if duration changes

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <AnimatedView style={[{ width: size, height: size }, animatedStyle]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={color} stopOpacity="0" />
            <Stop offset="50%" stopColor={color} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={color} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Subtle track behind the spinner */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.2}
        />

        {/* Foreground animated arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </AnimatedView>
  );
}
