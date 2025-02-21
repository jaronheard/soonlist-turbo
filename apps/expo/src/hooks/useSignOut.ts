import { useAuth } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import { toast } from "sonner-native";

import { useNotification } from "~/providers/NotificationProvider";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { clearPersistedStore } from "~/store";
import { api } from "~/utils/api";
import { deleteAuthData } from "./useAuthSync";

interface SignOutOptions {
  shouldDeleteAccount?: boolean;
}

export const useSignOut = () => {
  const utils = api.useUtils();
  const { signOut, userId } = useAuth();
  const { logout: revenueCatLogout } = useRevenueCat();
  const { expoPushToken, cleanup: cleanupNotifications } = useNotification();
  const { mutateAsync: deleteToken } = api.pushToken.deleteToken.useMutation();
  const { mutateAsync: deleteAccount } = api.user.deleteAccount.useMutation();

  return async (options?: SignOutOptions) => {
    if (!userId) return;

    // First cancel all ongoing queries and prevent refetching
    await utils.invalidate();

    // Reset local state and clear persisted data
    await clearPersistedStore();

    // Then clear all auth and third-party services
    try {
      await Promise.all([
        Intercom.logout(),
        revenueCatLogout(),
        deleteAuthData(),
        // Only attempt to delete token if it exists
        expoPushToken
          ? deleteToken({ userId, expoPushToken }).catch((error) => {
              console.error("Error deleting push token:", error);
              // Don't throw here, we want to continue with sign out
            })
          : Promise.resolve(),
        options?.shouldDeleteAccount ? deleteAccount() : Promise.resolve(),
        signOut(),
      ]);

      // Clean up notification state after successful sign out
      cleanupNotifications();
    } catch (error) {
      console.error("Error during sign out:", error);
      toast.error(
        "Error during sign out. Some data may not have been cleared.",
      );
      // Still attempt to clean up notification state
      cleanupNotifications();
      throw error;
    }
  };
};
