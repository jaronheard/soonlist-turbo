import Constants from "expo-constants";

export const isSimulator = () => {
  // Expo provides a way to detect if running in simulator
  return !Constants.isDevice;
};

export const isDevelopment = () => {
  return __DEV__;
};

export const shouldMockPaywall = () => {
  // Mock paywall in development or simulator
  return isDevelopment() || isSimulator();
};