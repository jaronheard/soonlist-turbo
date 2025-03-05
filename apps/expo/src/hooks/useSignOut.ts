import { OneSignal } from "react-native-onesignal";
import { useAuth } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";

import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { api } from "~/utils/api";
import { deleteAuthData } from "./useAuthSync";

// Logger for OneSignal operations
const logOneSignal = (
  operation: string,
  message: string,
  data?: Record<string, unknown>,
) => {
  const logData = {
    operation,
    message,
    timestamp: new Date().toISOString(),
    ...(data || {}),
  };

  console.log(`[OneSignal] ${operation}: ${message}`, logData);
};

interface SignOutOptions {
  shouldDeleteAccount?: boolean;
}

export const useSignOut = () => {
  const utils = api.useUtils();
  const { signOut, userId } = useAuth();
  const resetStore = useAppStore((state) => state.resetStore);
  const { logout: revenueCatLogout } = useRevenueCat();
  const { mutateAsync: deleteAccount } = api.user.deleteAccount.useMutation();

  return async (options?: SignOutOptions) => {
    if (!userId) return;

    logOneSignal("SignOut", "Starting sign out process", { userId });

    // First cancel all ongoing queries and prevent refetching
    await utils.invalidate();

    // Reset local state
    resetStore();

    // Log before OneSignal logout
    logOneSignal("SignOut", "Logging out from OneSignal", { userId });

    // Then clear all auth and third-party services
    await Promise.all([
      Intercom.logout(),
      revenueCatLogout(),
      deleteAuthData(),
      // OneSignal.logout() returns void, so we wrap it in a function that returns a promise
      (async () => {
        try {
          OneSignal.logout();
          logOneSignal("SignOut", "Successfully logged out from OneSignal", {
            userId,
          });
        } catch (error: unknown) {
          logOneSignal("Error", "Error logging out from OneSignal", {
            userId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })(),
      options?.shouldDeleteAccount ? deleteAccount() : undefined,
      signOut(),
    ]);

    logOneSignal("SignOut", "Sign out process completed", { userId });
  };
};
