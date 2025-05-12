import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

interface CircularSpinnerProps {
  size: number;
  strokeWidth: number;
  color: string;
  duration?: number; // Optional duration for one full rotation in ms
}

const AnimatedCircle = Animated.createAnimatedComponent(View);

export function CircularSpinner({
  size,
  strokeWidth,
  color,
  duration = 1000,
}: CircularSpinnerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${circumference * 0.8} ${circumference * 0.2}`; // 80% arc, 20% gap

  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration, easing: Easing.linear }),
      -1, // Infinite repeats
      false, // Don't reverse
    );
  }, [duration, rotation]); // Rerun if duration changes

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <AnimatedCircle style={[{ width: size, height: size }, animatedStyle]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          // Start the arc slightly offset so the rotation looks smoother
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </AnimatedCircle>
  );
}
