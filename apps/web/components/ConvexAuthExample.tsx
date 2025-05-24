"use client";

import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useConvexAuth,
} from "convex/react";

export function ConvexAuthExample() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-2 text-lg font-semibold">Convex Auth Status</h3>

      <AuthLoading>
        <div className="text-gray-500">Loading authentication...</div>
      </AuthLoading>

      <Authenticated>
        <div className="text-green-600">✅ Authenticated with Convex</div>
        <p className="mt-1 text-sm text-gray-600">
          You can now make authenticated Convex queries and mutations.
        </p>
      </Authenticated>

      <Unauthenticated>
        <div className="text-red-600">❌ Not authenticated</div>
        <p className="mt-1 text-sm text-gray-600">
          Please sign in to access Convex features.
        </p>
      </Unauthenticated>

      <div className="mt-2 text-xs text-gray-500">
        Hook status:{" "}
        {isLoading
          ? "Loading..."
          : isAuthenticated
            ? "Authenticated"
            : "Not authenticated"}
      </div>
    </div>
  );
}
