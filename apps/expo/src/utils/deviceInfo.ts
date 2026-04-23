import { Platform } from "react-native";
import Constants from "expo-constants";

export const isSimulator = () => {
  if (Constants.isDevice === true) {
    return false;
  }

  if (Constants.isDevice === false) {
    return true;
  }

  if (Platform.OS === "ios") {
    return (
      Constants.platform?.ios?.model?.includes("Simulator") ||
      Constants.deviceName?.includes("Simulator") ||
      false
    );
  }

  if (Platform.OS === "android") {
    return (
      Constants.deviceName?.toLowerCase().includes("emulator") ||
      Constants.deviceName?.toLowerCase().includes("sdk") ||
      false
    );
  }

  return false;
};

export const isDevelopment = () => {
  return __DEV__;
};

export const shouldMockPaywall = () => {
  return isSimulator();
};
