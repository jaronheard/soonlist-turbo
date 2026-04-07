import React from "react";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

import { SUPPORTS_LIQUID_GLASS } from "~/hooks/useLiquidGlass";

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
 *
 * Falls back to a solid purple background on devices without liquid glass support.
 */
export function LiquidGlassHeader() {
  if (!SUPPORTS_LIQUID_GLASS) {
    // Fallback: solid purple background for devices without blur support
    return <View className="absolute inset-0 bg-[#5A32FB]" />;
  }

  return (
    <View className="absolute inset-0 overflow-hidden">
      {/* Blur layer - content behind shows through blurred */}
      <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill} />
      {/* Light purple tint overlay */}
      <View
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(90, 50, 251, 0.9)" }}
      />
    </View>
  );
}
