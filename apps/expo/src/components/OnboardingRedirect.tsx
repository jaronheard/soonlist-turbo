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

  // Get user data from our database
  // Use "skip" pattern when user is not available or not authenticated
  const userData = useQuery(
    api.users.getById,
    isAuthenticated && user?.id ? { id: user.id } : "skip",
  );

  useEffect(() => {
    // Only proceed if user data is loaded and user is authenticated
    if (!isLoaded || !isAuthenticated || !user) {
      return;
    }

    // Don't redirect if already on auth or onboarding routes
    if (
      pathname.startsWith("/sign-in") ||
      pathname.startsWith("/sign-up") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/(auth)") ||
      pathname.startsWith("/(onboarding)")
    ) {
      return;
    }

    // Check if onboarding is completed
    const isOnboardingCompleted =
      hasCompletedOnboarding || !!userData?.onboardingCompletedAt;

    // Redirect to onboarding if not completed
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

  // This component doesn't render anything
  return null;
}
