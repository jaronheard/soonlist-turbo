import type { CustomerInfo } from "react-native-purchases";
import appsFlyer from "react-native-appsflyer";
import Purchases from "react-native-purchases";

import { logError, logMessage } from "./errorLogging";

export const AF_EVENTS = {
  COMPLETE_REGISTRATION: "af_complete_registration",
  LOGIN: "af_login",
  CONTENT_VIEW: "af_content_view",
  SHARE: "af_share",
  START_TRIAL: "af_start_trial",
  PURCHASE: "af_purchase",
} as const;

export function trackAFEvent(
  eventName: string,
  eventValues: Record<string, string | number | boolean>,
): void {
  try {
    appsFlyer.logEvent(eventName, eventValues);
  } catch (error) {
    logError("AppsFlyer event tracking failed", error, { eventName });
  }
}

/**
 * Logs an af_purchase event to AppsFlyer after a successful subscription purchase.
 * Fetches pricing info from RevenueCat offerings and matches it to the active subscription.
 */
export async function trackPurchaseEvent(
  customerInfo: CustomerInfo,
): Promise<void> {
  try {
    // Get active subscriptions from customer info
    const activeSubscriptions = customerInfo.activeSubscriptions;
    if (!activeSubscriptions || activeSubscriptions.length === 0) {
      logMessage("No active subscriptions found for purchase tracking");
      return;
    }

    // Get offerings to find pricing info
    const offerings = await Purchases.getOfferings();
    if (!offerings.current) {
      logMessage("No current offering found for purchase tracking");
      return;
    }

    // Find the package that matches the active subscription
    const allPackages = offerings.current.availablePackages;
    const activeProductId = activeSubscriptions[0];
    const matchingPackage = allPackages.find(
      (pkg) => pkg.storeProduct.identifier === activeProductId,
    );

    if (!matchingPackage) {
      logMessage("Could not find matching package for purchase tracking", {
        activeProductId,
      });
      return;
    }

    const { storeProduct } = matchingPackage;
    const price = storeProduct.price;
    const currencyCode = storeProduct.currencyCode;

    const eventValues = {
      af_revenue: price,
      af_currency: currencyCode,
      af_quantity: 1,
      af_content_id: activeProductId ?? "",
    };

    appsFlyer.logEvent(
      AF_EVENTS.PURCHASE,
      eventValues,
      (result) => {
        logMessage("AppsFlyer purchase logged successfully", { result });
      },
      (error) => {
        logError("AppsFlyer purchase log error", error);
      },
    );
  } catch (error) {
    logError("Failed to track purchase event", error);
  }
}
