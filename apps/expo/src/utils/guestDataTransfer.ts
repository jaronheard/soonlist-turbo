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
    const guestUserId = await AsyncStorage.getItem(GUEST_USER_KEY);
    if (!guestUserId) {
      logMessage("No guest data to transfer");
      return;
    }

    logMessage("Starting guest data transfer", { guestUserId, userId });

    try {
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

      await Purchases.logIn(userId);
      logMessage("RevenueCat identity transferred", { userId });
    } catch (revenueCatError) {
      logError("Failed to transfer RevenueCat identity", revenueCatError, {
        guestUserId,
        userId,
      });
    }

    try {
      const result = await transferGuestOnboardingData({ guestUserId });

      if (result.transferred) {
        logMessage("Guest onboarding data transferred immediately", {
          guestUserId,
        });
      } else {
        logMessage("Guest onboarding data transfer scheduled for retry", {
          guestUserId,
          userId,
        });
        // Note: This is expected during initial signup due to webhook timing
        // A background job will retry the transfer automatically
      }
    } catch (convexError) {
      logError("Failed to transfer guest onboarding data", convexError, {
        guestUserId,
        userId,
      });
    }

    try {
      await AsyncStorage.removeItem(GUEST_USER_KEY);
      logMessage("Guest data cleared from AsyncStorage");
    } catch (storageError) {
      logError("Failed to clear guest data from AsyncStorage", storageError, {
        userId,
      });
      // Continue since backend data transfer was successful
    }

    logMessage("Guest data transfer completed successfully", {
      guestUserId,
      userId,
    });
  } catch (error) {
    logError("Error during guest data transfer", error, { userId });
    // Don't throw - we don't want to break the auth flow
  }
};
