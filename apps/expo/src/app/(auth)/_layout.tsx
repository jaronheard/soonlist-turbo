import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { ResetAuthButton } from "~/components/auth/ResetAuthButton";
import { GUEST_USER_KEY, HAS_GUEST_EVENTS_KEY } from "~/hooks/useGuestUser";

export default function AuthLayout() {
  const { isAuthenticated } = useConvexAuth();
  const transferGuestEvents = useMutation(api.guestEvents.transferGuestEvents);

  // Fetch user data only when authenticated.
  // Pass "skip" to useQuery to prevent it from running if not authenticated.
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );

  // Handle guest event transfer when user becomes authenticated
  useEffect(() => {
    const handleGuestEventTransfer = async () => {
      if (isAuthenticated && user?.onboardingCompletedAt) {
        try {
          const hasGuestEvents =
            await AsyncStorage.getItem(HAS_GUEST_EVENTS_KEY);
          const guestUserId = await AsyncStorage.getItem(GUEST_USER_KEY);

          if (hasGuestEvents === "true" && guestUserId) {
            console.log("Transferring guest events for user:", guestUserId);
            const transferredCount = await transferGuestEvents({ guestUserId });
            console.log(`Transferred ${transferredCount} guest events`);

            // Clean up guest data after successful transfer
            await AsyncStorage.multiRemove([
              HAS_GUEST_EVENTS_KEY,
              GUEST_USER_KEY,
            ]);
          }
        } catch (error) {
          console.error("Failed to transfer guest events:", error);
        }
      }
    };

    void handleGuestEventTransfer();
  }, [isAuthenticated, user?.onboardingCompletedAt, transferGuestEvents]);

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
        ) : !user?.onboardingCompletedAt ? (
          // User record doesn't exist in DB OR user exists but is not onboarded
          <Redirect href="/(onboarding)/onboarding" />
        ) : (
          <Redirect href="/(tabs)/feed" />
        )}
      </Authenticated>
    </>
  );
}
