import { Platform } from "react-native";

/**
 * Constant for checking iOS 26+ Liquid Glass support.
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
