import { router } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";

import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { api } from "~/utils/api";
import { deleteAuthData } from "./useAuthSync";

export const useSignOut = () => {
  const utils = api.useUtils();
  const { signOut } = useAuth();
  const resetStore = useAppStore((state) => state.resetStore);
  const { logout: revenueCatLogout } = useRevenueCat();

  return async () => {
    // First cancel all ongoing queries and prevent refetching
    await utils.invalidate();

    // Reset local state
    resetStore();

    // Then clear all auth and third-party services
    await Promise.all([
      Intercom.logout(),
      revenueCatLogout(),
      deleteAuthData(),
      signOut(),
    ]);

    // Finally navigate away
    router.replace("/sign-in");
  };
};
