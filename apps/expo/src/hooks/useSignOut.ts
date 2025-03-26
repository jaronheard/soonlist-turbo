import { useAuth } from "@clerk/clerk-expo";
import { usePostHog } from "posthog-react-native";

import { resetUserData } from "~/utils/userDataSync";
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
  const posthog = usePostHog();

  return async (options?: SignOutOptions) => {
    if (!userId) return;

    // First cancel all ongoing queries and prevent refetching
    await utils.invalidate();

    // Reset local state
    resetStore();

    // Reset all third-party services
    await resetUserData(posthog);

    // Then clear all auth and other services
    await Promise.all([
      revenueCatLogout(),
      deleteAuthData(),
      options?.shouldDeleteAccount ? deleteAccount() : undefined,
      signOut(),
    ]);
  };
};
