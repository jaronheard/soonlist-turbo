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

export { ErrorBoundary } from "expo-router";

export default function AuthLayout() {
  const { isAuthenticated } = useConvexAuth();

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
        {user === undefined ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <Redirect href="/(tabs)/feed" />
        )}
      </Authenticated>
    </>
  );
}
