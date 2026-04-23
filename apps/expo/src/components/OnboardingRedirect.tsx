import { useEffect } from "react";
import { usePathname, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useConvexAuth, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useAppStore } from "~/store";

export function OnboardingRedirect() {
  const { user, isLoaded } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { hasCompletedOnboarding } = useAppStore();

  const userData = useQuery(
    api.users.getById,
    isAuthenticated && user?.id ? { id: user.id } : "skip",
  );

  useEffect(() => {
    if (!isLoaded || !isAuthenticated || !user) {
      return;
    }

    if (
      pathname.startsWith("/sign-in") ||
      pathname.startsWith("/sign-up") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/(auth)") ||
      pathname.startsWith("/(onboarding)")
    ) {
      return;
    }

    const isOnboardingCompleted =
      hasCompletedOnboarding || !!userData?.onboardingCompletedAt;

    if (!isOnboardingCompleted) {
      router.replace("/onboarding");
    }
  }, [
    isLoaded,
    isAuthenticated,
    user,
    userData,
    hasCompletedOnboarding,
    pathname,
    router,
  ]);

  return null;
}
