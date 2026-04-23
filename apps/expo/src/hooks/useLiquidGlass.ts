import { Platform } from "react-native";

export function useLiquidGlass(): boolean {
  if (Platform.OS !== "ios") {
    return false;
  }

  const version = Platform.Version;
  const majorVersion =
    typeof version === "string"
      ? parseInt(version.split(".")[0] || "0", 10)
      : 0;

  return majorVersion >= 26;
}

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
