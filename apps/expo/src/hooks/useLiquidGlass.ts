import { Platform } from "react-native";

/**
 * useLiquidGlass
 * --------------
 * Detects if the device supports iOS 26 Liquid Glass UI effects.
 * Returns true only on iOS 26+, false on older iOS versions and Android.
 *
 * iOS 26 corresponds to iOS version "26.x" which will be available in 2025+.
 * Until then, this check helps us provide appropriate fallbacks.
 */
export function useLiquidGlass(): boolean {
  if (Platform.OS !== "ios") {
    return false;
  }

  // Platform.Version on iOS is a string like "17.0" or "26.0"
  const version = Platform.Version;
  const majorVersion =
    typeof version === "string"
      ? parseInt(version.split(".")[0] || "0", 10)
      : 0;

  // iOS 26 introduces Liquid Glass effects
  return majorVersion >= 26;
}

/**
 * Constant for checking liquid glass support without a hook.
 * Useful for static configurations outside of React components.
 */
export const SUPPORTS_LIQUID_GLASS: boolean = (() => {
  if (Platform.OS !== "ios") {
    return false;
  }
  const version = Platform.Version;
  const majorVersion =
    typeof version === "string"
      ? parseInt(version.split(".")[0] || "0", 10)
      : 0;
  return majorVersion >= 26;
})();
