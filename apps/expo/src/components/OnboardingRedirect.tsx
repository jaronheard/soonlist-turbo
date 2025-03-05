import { useEffect } from "react";
import { usePathname, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import { api } from "~/utils/api";
import { useAppStore } from "~/store";

export function OnboardingRedirect() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { hasCompletedOnboarding } = useAppStore();

  // Get user data from our database
  const { data: userData } = api.user.getById.useQuery(
    { id: user?.id ?? "" },
    { enabled: isLoaded && isSignedIn && !!user?.id },
  );

  useEffect(() => {
    // Only proceed if user data is loaded and user is signed in
    if (!isLoaded || !isSignedIn || !user) {
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
    isSignedIn,
    user,
    userData,
    hasCompletedOnboarding,
    pathname,
    router,
  ]);

  // This component doesn't render anything
  return null;
}
