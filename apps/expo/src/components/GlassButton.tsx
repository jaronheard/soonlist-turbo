import React from "react";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

interface GlassButtonProps {
  children: React.ReactNode;
  size?: number;
  tintColor?: string;
  tintOpacity?: number;
  style?: object;
}

/**
 * GlassButton
 * -----------
 * iOS 26 Liquid Glass icon button.
 * Specs: blur=60, opacity=0.8, shadow=18, circular shape
 */
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
      {/* iOS 26 blur: intensity 60 */}
      <BlurView intensity={60} tint="light" style={styles.blur} />
      {/* Color tint */}
      <View
        style={[
          styles.tint,
          { backgroundColor: tintColor, opacity: tintOpacity },
        ]}
      />
      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

/**
 * GlassPill
 * ---------
 * iOS 26 Liquid Glass primary button (pill shape).
 * Specs: blur=60, opacity=0.6, cornerRadius=28, shadow=18
 */
export function GlassPill({
  children,
  tintColor = "#5A32FB",
  tintOpacity = 0.6,
  style,
}: Omit<GlassButtonProps, "size">) {
  return (
    <View style={[styles.pillContainer, style]}>
      {/* iOS 26 blur: intensity 60 */}
      <BlurView intensity={60} tint="light" style={styles.blur} />
      {/* Color tint */}
      <View
        style={[
          styles.tint,
          { backgroundColor: tintColor, opacity: tintOpacity },
        ]}
      />
      {/* Content */}
      <View style={styles.pillContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    overflow: "hidden",
    // iOS 26: shadow radius 18
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
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // iOS 26: padding 12 for icon buttons
    padding: 12,
  },
  pillContainer: {
    overflow: "hidden",
    // iOS 26: corner radius 28
    borderRadius: 28,
    // iOS 26: shadow radius 18
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
    // iOS 26: padding 16
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
});
