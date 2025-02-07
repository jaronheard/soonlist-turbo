import { router } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";

import { useNotification } from "~/providers/NotificationProvider";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { api } from "~/utils/api";
import { deleteAuthData } from "./useAuthSync";

interface SignOutOptions {
  shouldDeleteAccount?: boolean;
}

export const useSignOut = () => {
  const utils = api.useUtils();
  const { signOut, userId } = useAuth();
  const resetStore = useAppStore((state) => state.resetStore);
  const { logout: revenueCatLogout } = useRevenueCat();
  const { expoPushToken } = useNotification();
  const { mutateAsync: deleteToken } = api.pushToken.deleteToken.useMutation();
  const { mutateAsync: deleteAccount } = api.user.deleteAccount.useMutation();

  return async (options?: SignOutOptions) => {
    if (!userId) return;

    // First cancel all ongoing queries and prevent refetching
    await utils.invalidate();

    // Reset local state
    resetStore();

    // Then clear all auth and third-party services
    await Promise.all([
      Intercom.logout(),
      revenueCatLogout(),
      deleteAuthData(),
      deleteToken({ userId, expoPushToken }),
      options?.shouldDeleteAccount ? deleteAccount() : undefined,
      signOut(),
    ]);

    // Finally navigate away
    router.replace("/sign-in");
  };
};
