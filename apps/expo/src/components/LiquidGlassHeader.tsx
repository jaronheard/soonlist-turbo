import React from "react";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

/**
 * LiquidGlassHeader
 * -----------------
 * iOS Liquid Glass header with brand purple tint.
 *
 * Layering (bottom to top):
 * 1. BlurView - blurs content scrolling behind
 * 2. Semi-transparent purple - tints the blurred content
 *
 * Brand purple: #5A32FB
 */
export function LiquidGlassHeader() {
  return (
    <View style={styles.container}>
      {/* Blur layer - content behind shows through blurred */}
      <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill} />
      {/* Light purple tint overlay */}
      <View style={styles.purpleTint} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  purpleTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(90, 50, 251, 0.9)", // #5A32FB at 40% opacity
  },
});
