import { OneSignal } from "react-native-onesignal";
import { useAuth } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import { useMutation } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";
import { deleteAuthData } from "./useAuthSync";

interface SignOutOptions {
  shouldDeleteAccount?: boolean;
}

export const useSignOut = () => {
  const { signOut, userId } = useAuth();
  const resetStore = useAppStore((state) => state.resetStore);
  const setHasCompletedOnboarding = useAppStore(
    (state) => state.setHasCompletedOnboarding,
  );
  const { logout: revenueCatLogout } = useRevenueCat();
  const deleteAccount = useMutation(api.users.deleteAccount);

  return async (options?: SignOutOptions) => {
    if (!userId) return;

    // Reset local state
    resetStore();

    // Then clear all auth and third-party services
    await Promise.all([
      Intercom.logout(),
      revenueCatLogout(),
      deleteAuthData(),
      OneSignal.logout(),
      options?.shouldDeleteAccount
        ? deleteAccount({ userId }).catch((error) => {
            logError("Failed to delete account", error);
          })
        : undefined,
      signOut(),
    ]);

    setHasCompletedOnboarding(false);
  };
};
