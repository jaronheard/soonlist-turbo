import React from "react";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

import { SUPPORTS_LIQUID_GLASS } from "~/hooks/useLiquidGlass";

interface GlassButtonProps {
  children: React.ReactNode;
  size?: number;
  tintColor?: string;
  tintOpacity?: number;
  style?: object;
}

export function GlassButton({
  children,
  size = 70,
  tintColor = "#5A32FB",
  tintOpacity = 0.8,
  style,
}: GlassButtonProps) {
  return (
    <View
      style={[
        styles.iconContainer,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {SUPPORTS_LIQUID_GLASS ? (
        <>
          <BlurView intensity={60} tint="light" style={styles.blur} />
          <View
            style={[
              styles.tint,
              { backgroundColor: tintColor, opacity: tintOpacity },
            ]}
          />
        </>
      ) : (
        <View
          style={[styles.fallbackBackground, { backgroundColor: tintColor }]}
        />
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function GlassPill({
  children,
  tintColor = "#5A32FB",
  tintOpacity = 0.6,
  style,
}: Omit<GlassButtonProps, "size">) {
  return (
    <View style={[styles.pillContainer, style]}>
      {SUPPORTS_LIQUID_GLASS ? (
        <>
          <BlurView intensity={60} tint="light" style={styles.blur} />
          <View
            style={[
              styles.tint,
              { backgroundColor: tintColor, opacity: tintOpacity },
            ]}
          />
        </>
      ) : (
        <View
          style={[styles.fallbackBackground, { backgroundColor: tintColor }]}
        />
      )}
      <View style={styles.pillContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    overflow: "hidden",
    shadowColor: "#5A32FB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  pillContainer: {
    overflow: "hidden",
    borderRadius: 28,
    shadowColor: "#5A32FB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  pillContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
});
