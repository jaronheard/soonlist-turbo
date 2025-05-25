import React from "react";
import { Text, View } from "react-native";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useConvexAuth,
} from "convex/react";

export function ConvexAuthExample() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <View className="m-4 rounded-lg border border-gray-200 p-4">
      <Text className="mb-2 text-lg font-semibold text-gray-900">
        Convex Auth Status
      </Text>

      <AuthLoading>
        <Text className="text-gray-500">Loading authentication...</Text>
      </AuthLoading>

      <Authenticated>
        <Text className="text-green-600">✅ Authenticated with Convex</Text>
        <Text className="mt-1 text-sm text-gray-600">
          You can now make authenticated Convex queries and mutations.
        </Text>
      </Authenticated>

      <Unauthenticated>
        <Text className="text-red-600">❌ Not authenticated</Text>
        <Text className="mt-1 text-sm text-gray-600">
          Please sign in to access Convex features.
        </Text>
      </Unauthenticated>

      <Text className="mt-2 text-xs text-gray-500">
        Hook status:{" "}
        {isLoading
          ? "Loading..."
          : isAuthenticated
            ? "Authenticated"
            : "Not authenticated"}
      </Text>
    </View>
  );
}
