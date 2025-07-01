import Constants from "expo-constants";
import { Platform } from "react-native";

export const isSimulator = () => {
  // Constants.isDevice can be undefined in development builds
  // So we need additional checks
  if (Constants.isDevice === true) {
    return false; // Definitely a real device
  }
  
  if (Constants.isDevice === false) {
    return true; // Definitely a simulator
  }
  
  // If Constants.isDevice is undefined, use platform-specific checks
  if (Platform.OS === "ios") {
    // Check for simulator-specific properties
    return (
      Constants.platform?.ios?.model?.includes("Simulator") ||
      Constants.deviceName?.includes("Simulator") ||
      false
    );
  }
  
  if (Platform.OS === "android") {
    // Android emulator checks
    return (
      Constants.deviceName?.toLowerCase().includes("emulator") ||
      Constants.deviceName?.toLowerCase().includes("sdk") ||
      false
    );
  }
  
  // Default to assuming it's a real device if we can't determine
  return false;
};

export const isDevelopment = () => {
  return __DEV__;
};

export const shouldMockPaywall = () => {
  // Mock paywall only in simulator, not on real devices
  return isSimulator();
};
