import { OneSignal } from "react-native-onesignal";
import { useAuth } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import { useMutation } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";

interface SignOutOptions {
  shouldDeleteAccount?: boolean;
}

export const useSignOut = () => {
  const { signOut, userId } = useAuth();
  const resetStore = useAppStore((state) => state.resetStore);
  const resetForLogout = useAppStore((state) => state.resetForLogout);
  const setHasCompletedOnboarding = useAppStore(
    (state) => state.setHasCompletedOnboarding,
  );
  const { logout: revenueCatLogout } = useRevenueCat();
  const deleteAccount = useMutation(api.users.deleteAccount);

  return async (options?: SignOutOptions) => {
    if (!userId) return;

    // Step 1 (optional): Delete account data on backend. This needs auth.
    if (options?.shouldDeleteAccount) {
      try {
        await deleteAccount({ userId });
      } catch (error) {
        // Log the error but continue with sign out
        logError("Failed to delete account during sign out", error);
      }
    }

    // Step 2: Sign out from Clerk. This revokes the token.
    try {
      await signOut();
    } catch (error) {
      // If already signed out, continue with cleanup
      if (
        error instanceof Error &&
        error.message?.includes("You are signed out")
      ) {
        // User is already signed out, continue with cleanup
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    // Step 3: Clean up local data and third-party sessions.
    // These should not require auth and can run concurrently.
    const logoutResults = await Promise.allSettled([
      Intercom.logout(),
      revenueCatLogout(),
      OneSignal.logout(),
    ]);

    logoutResults.forEach((result, index) => {
      if (result.status === "rejected") {
        const services = ["Intercom", "RevenueCat", "OneSignal"];
        const error = result.reason as
          | Error
          | { message?: string; code?: string };

        // Ignore expected errors
        if (
          (error instanceof Error &&
            (error.message?.includes("You are signed out") ||
              error.message?.includes("current user is anonymous"))) ||
          (typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "signed_out")
        ) {
          // These are expected when logging out - don't log as errors
          return;
        }

        logError(`Failed to logout from ${services[index]}`, error);
      }
    });

    // Step 4: Reset local app state AFTER successful sign out.
    // Use full reset for account deletion, partial reset for regular logout
    if (options?.shouldDeleteAccount) {
      resetStore();
    } else {
      resetForLogout();
    }
    setHasCompletedOnboarding(false);
  };
};
