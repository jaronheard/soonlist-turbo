"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useConvexAuth } from "convex/react";

export function ConvexAuthExample() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Convex Auth Status</h3>
      
      <AuthLoading>
        <div className="text-gray-500">Loading authentication...</div>
      </AuthLoading>

      <Authenticated>
        <div className="text-green-600">✅ Authenticated with Convex</div>
        <p className="text-sm text-gray-600 mt-1">
          You can now make authenticated Convex queries and mutations.
        </p>
      </Authenticated>

      <Unauthenticated>
        <div className="text-red-600">❌ Not authenticated</div>
        <p className="text-sm text-gray-600 mt-1">
          Please sign in to access Convex features.
        </p>
      </Unauthenticated>

      <div className="mt-2 text-xs text-gray-500">
        Hook status: {isLoading ? "Loading..." : isAuthenticated ? "Authenticated" : "Not authenticated"}
      </div>
    </div>
  );
}

