import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

import { useAppStore } from "~/store";

export default function AuthRoutesLayout() {
  const { isSignedIn } = useAuth();
  const hasCompletedOnboarding = useAppStore(
    (state) => state.hasCompletedOnboarding,
  );

  if (isSignedIn && hasCompletedOnboarding) {
    return <Redirect href={"/feed"} />;
  }

  if (isSignedIn && !hasCompletedOnboarding) {
    return <Redirect href={"/onboarding"} />;
  }

  return <Stack />;
}
