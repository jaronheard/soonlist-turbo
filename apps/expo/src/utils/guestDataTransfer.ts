import Purchases from "react-native-purchases";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { GUEST_USER_KEY } from "~/hooks/useGuestUser";
import { logError, logMessage } from "~/utils/errorLogging";

interface TransferGuestDataParams {
  userId: string;
  transferGuestOnboardingData: (args: {
    guestUserId: string;
  }) => Promise<{ transferred: boolean }>;
}

export const transferGuestData = async ({
  userId,
  transferGuestOnboardingData,
}: TransferGuestDataParams): Promise<void> => {
  try {
    // Check for guest user ID early to avoid unnecessary work
    const guestUserId = await AsyncStorage.getItem(GUEST_USER_KEY);
    if (!guestUserId) {
      logMessage("No guest data to transfer");
      return; // No guest data to transfer
    }

    logMessage("Starting guest data transfer", { guestUserId, userId });

    // Step 1: Transfer RevenueCat subscription
    // RevenueCat will automatically associate the anonymous user's purchases
    // with the new authenticated user when we log in with the userId
    try {
      // Get the current anonymous user's customer info before logging in
      const anonymousCustomerInfo = await Purchases.getCustomerInfo();
      const hasActiveSubscription =
        anonymousCustomerInfo.activeSubscriptions.length > 0;
      const hasEntitlements =
        Object.keys(anonymousCustomerInfo.entitlements.active).length > 0;

      if (hasActiveSubscription || hasEntitlements) {
        logMessage("Guest user has active subscriptions/entitlements", {
          subscriptions: anonymousCustomerInfo.activeSubscriptions,
          entitlements: Object.keys(anonymousCustomerInfo.entitlements.active),
        });
      }

      // Log in with the authenticated user ID
      // This will transfer the anonymous user's purchases
      await Purchases.logIn(userId);
      logMessage("RevenueCat identity transferred", { userId });
    } catch (revenueCatError) {
      // Log the error but continue with other transfers
      logError("Failed to transfer RevenueCat identity", revenueCatError, {
        guestUserId,
        userId,
      });
    }

    // Step 2: Transfer guest onboarding data
    let onboardingTransferred = false;
    try {
      const result = await transferGuestOnboardingData({ guestUserId });
      onboardingTransferred = result.transferred;
      
      if (onboardingTransferred) {
        logMessage("Guest onboarding data transferred", { guestUserId });
      } else {
        logMessage("Guest onboarding data not transferred (user may not be created yet)", { 
          guestUserId,
          userId 
        });
        // Note: This is expected during initial signup due to webhook timing
        // The data will remain in guest mode until next login
      }
    } catch (convexError) {
      logError("Failed to transfer guest onboarding data", convexError, {
        guestUserId,
        userId,
      });
    }

    // Step 3: Clear guest data from AsyncStorage only if transfer succeeded
    if (onboardingTransferred) {
      await AsyncStorage.removeItem(GUEST_USER_KEY);
      logMessage("Guest data cleared from AsyncStorage");
    } else {
      logMessage("Guest data retained for future transfer attempt");
    }

    // Step 4: Log successful transfer completion
    logMessage("Guest data transfer completed successfully", {
      guestUserId,
      userId,
    });
  } catch (error) {
    logError("Error during guest data transfer", error, { userId });
    // Don't throw - we don't want to break the auth flow
  }
};
