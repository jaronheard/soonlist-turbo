import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

/**
 * Show the paywall only if the user doesn't currently have "pro" entitlement.
 * This uses the "presentPaywallIfNeeded" from react-native-purchases-ui.
 * If the user is already Pro, nothing will happen.
 */
async function showProPaywallIfNeeded() {
  try {
    const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: "pro",
    });
    switch (paywallResult) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        // User now has Pro; update local customerInfo automatically via listener
        break;
      default:
        // Not purchased, or user cancelled
        break;
    }
  } catch (err) {
    console.error("Error presenting paywall:", err);
  }
}

return {
  // ... existing code ...
  showProPaywallIfNeeded,
}; 