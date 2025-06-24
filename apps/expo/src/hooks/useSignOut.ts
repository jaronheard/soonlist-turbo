import { OneSignal } from "react-native-onesignal";
import { useAuth } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import { useMutation } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { deleteAuthData } from "~/components/AuthAndTokenSync";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";

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
    await signOut();

    // Step 3: Clean up local data and third-party sessions.
    // These should not require auth and can run concurrently.
    await Promise.all([
      Intercom.logout(),
      revenueCatLogout(),
      deleteAuthData(),
      OneSignal.logout(),
    ]);

    // Step 4: Reset local app state AFTER successful sign out.
    resetStore();
    setHasCompletedOnboarding(false);
  };
};
