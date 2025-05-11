import React, { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface CircularProgressProps {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  children?: ReactNode;
}

export function CircularProgress({
  progress,
  size,
  strokeWidth,
  color,
  children,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          stroke="#E6E6E6"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.childrenContainer]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  childrenContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});

