import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

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
  await Purchases.setLogLevel(
    process.env.EXPO_PUBLIC_APP_ENV === "development"
      ? LOG_LEVEL.DEBUG
      : LOG_LEVEL.INFO,
  );

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

export async function setPostHogUserId(userId: string) {
  try {
    await Purchases.setAttributes({
      $posthogUserId: userId,
    });
    console.log("PostHog user ID set in RevenueCat:", userId);
  } catch (error) {
    console.error("Error setting PostHog user ID in RevenueCat:", error);
  }
}
