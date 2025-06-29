import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useConvexAuth,
  useQuery,
} from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { ResetAuthButton } from "~/components/auth/ResetAuthButton";
import { useAppStore } from "~/store";

export default function AuthLayout() {
  const { isAuthenticated } = useConvexAuth();
  const { onboardingData } = useAppStore();

  // Fetch user data only when authenticated.
  // Pass "skip" to useQuery to prevent it from running if not authenticated.
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );

  return (
    <>
      <AuthLoading>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </AuthLoading>
      <Unauthenticated>
        {/* Stack for unauthenticated users */}
        <View className="flex-1">
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="sign-in-email" />
            <Stack.Screen name="sign-up-email" />
            <Stack.Screen name="verify-email" />
          </Stack>
          <View className="absolute bottom-4 w-full items-center">
            <ResetAuthButton />
          </View>
        </View>
      </Unauthenticated>

      <Authenticated>
        {/* This content is rendered only when isAuthenticated (from useConvexAuth) is true */}
        {/* Now we handle the state of the 'user' query */}
        {user === undefined ? (
          // user query is loading (or was skipped and now isAuthenticated is true, so it's re-fetching)
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
          </View>
        ) : (
          // Authenticated users always go to feed
          // They should never see onboarding even if onboardingCompletedAt is not set
          <Redirect href="/(tabs)/feed" />
        )}
      </Authenticated>
    </>
  );
}
