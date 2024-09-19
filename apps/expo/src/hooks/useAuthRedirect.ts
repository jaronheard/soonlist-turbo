import { useCallback } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

import { useAppStore } from "~/store";

export function useAuthRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const hasCompletedOnboarding = useAppStore(
    (state) => state.hasCompletedOnboarding,
  );

  const checkOnboardingStatus = useCallback(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (isSignedIn && inAuthGroup) {
      if (hasCompletedOnboarding) {
        router.replace("/feed");
      } else {
        router.replace("/onboarding");
      }
    }
    if (!isSignedIn && !inAuthGroup) {
      router.replace("/sign-in");
    }
  }, [isSignedIn, router, segments, isLoaded, hasCompletedOnboarding]);

  return { checkOnboardingStatus };
}
