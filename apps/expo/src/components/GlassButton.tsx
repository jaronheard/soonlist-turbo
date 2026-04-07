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

/**
 * GlassButton
 * -----------
 * iOS 26 Liquid Glass icon button.
 * Specs: blur=60, opacity=0.8, shadow=18, circular shape
 *
 * Falls back to a solid background on devices without liquid glass support.
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
      className="overflow-hidden"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: "#5A32FB",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 18,
          elevation: 8,
        },
        style,
      ]}
    >
      {SUPPORTS_LIQUID_GLASS ? (
        <>
          {/* iOS 26 blur: intensity 60 */}
          <BlurView intensity={60} tint="light" style={styles.blur} />
          {/* Color tint */}
          <View
            className="absolute inset-0"
            style={[{ backgroundColor: tintColor, opacity: tintOpacity }]}
          />
        </>
      ) : (
        /* Fallback: solid background for devices without blur support */
        <View
          className="absolute inset-0"
          style={{ backgroundColor: tintColor }}
        />
      )}
      {/* Content */}
      <View className="flex-1 items-center justify-center p-3">{children}</View>
    </View>
  );
}

/**
 * GlassPill
 * ---------
 * iOS 26 Liquid Glass primary button (pill shape).
 * Specs: blur=60, opacity=0.6, cornerRadius=28, shadow=18
 *
 * Falls back to a solid background on devices without liquid glass support.
 */
export function GlassPill({
  children,
  tintColor = "#5A32FB",
  tintOpacity = 0.6,
  style,
}: Omit<GlassButtonProps, "size">) {
  return (
    <View
      className="overflow-hidden rounded-[28px]"
      style={[
        {
          shadowColor: "#5A32FB",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 18,
          elevation: 8,
        },
        style,
      ]}
    >
      {SUPPORTS_LIQUID_GLASS ? (
        <>
          {/* iOS 26 blur: intensity 60 */}
          <BlurView intensity={60} tint="light" style={styles.blur} />
          {/* Color tint */}
          <View
            className="absolute inset-0"
            style={[{ backgroundColor: tintColor, opacity: tintOpacity }]}
          />
        </>
      ) : (
        /* Fallback: solid background for devices without blur support */
        <View
          className="absolute inset-0"
          style={{ backgroundColor: tintColor }}
        />
      )}
      {/* Content */}
      <View className="flex-row items-center gap-4 px-6 py-4">{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
});
