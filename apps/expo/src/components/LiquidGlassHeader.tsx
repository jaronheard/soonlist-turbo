import React from "react";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

import { SUPPORTS_LIQUID_GLASS } from "~/hooks/useLiquidGlass";

export function LiquidGlassHeader() {
  if (!SUPPORTS_LIQUID_GLASS) {
    return <View style={styles.fallbackContainer} />;
  }

  return (
    <View style={styles.container}>
      <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.purpleTint} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  fallbackContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#5A32FB", // Solid brand purple
  },
  purpleTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(90, 50, 251, 0.9)", // #5A32FB at 90% opacity
  },
});
