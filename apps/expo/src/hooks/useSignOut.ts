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

    if (options?.shouldDeleteAccount) {
      try {
        await deleteAccount({ userId });
      } catch (error) {
        logError("Failed to delete account during sign out", error);
      }
    }

    try {
      await signOut();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message?.includes("You are signed out")
      ) {
        // User is already signed out, continue with cleanup
      } else {
        throw error;
      }
    }

    const logoutResults = await Promise.allSettled([
      Intercom.logout(),
      revenueCatLogout(),
      Promise.resolve(OneSignal.logout()), // OneSignal.logout() returns void, wrap in Promise
    ]);

    logoutResults.forEach((result, index) => {
      if (result.status === "rejected") {
        const services = ["Intercom", "RevenueCat", "OneSignal"];
        const error = result.reason as
          | Error
          | { message?: string; code?: string };

        if (
          (error instanceof Error &&
            (error.message?.includes("You are signed out") ||
              error.message?.includes("current user is anonymous"))) ||
          (typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "signed_out")
        ) {
          return;
        }

        logError(`Failed to logout from ${services[index]}`, error);
      }
    });

    if (options?.shouldDeleteAccount) {
      resetStore();
    } else {
      resetForLogout();
    }
    setHasCompletedOnboarding(false);
  };
};
