import { OneSignal } from "react-native-onesignal";
import { useAuth } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";

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
      OneSignal.logout(),
      options?.shouldDeleteAccount ? deleteAccount() : undefined,
      signOut(),
    ]);
  };
};
