import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import * as Device from "expo-device";

interface RevenueCatConfig {
  apiKey: {
    ios: string;
    android: string;
  };
}

const config: RevenueCatConfig = {
  apiKey: {
    ios:
      process.env.EXPO_PUBLIC_APP_ENV === "development"
        ? "appl_IZAYFSAmdJzydibrbUAgIqoKwMH" // Dev key
        : "appl_EBIBnBkxycdwGemEotOpxJltoqp", // Prod key - replace with actual prod key
    android:
      process.env.EXPO_PUBLIC_APP_ENV === "development"
        ? "" // Dev key
        : "", // Prod key - replace with actual prod key
  },
};

export async function initializeRevenueCat() {
  if (Device.isDevice) {
    await Purchases.setLogLevel(LOG_LEVEL.DEBUG); // Set to DEBUG in development

    const apiKey = Platform.select({
      ios: config.apiKey.ios,
      android: config.apiKey.android,
      default: "",
    });

    if (!apiKey) {
      throw new Error("No API key for platform");
    }

    Purchases.configure({ apiKey });
  }
}

export async function getCurrentSubscriptionStatus() {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active;
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return {};
  }
}

export async function restorePurchases() {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error("Error restoring purchases:", error);
    throw error;
  }
}
