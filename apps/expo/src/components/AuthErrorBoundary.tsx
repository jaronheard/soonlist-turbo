import React, { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { toast } from "sonner-native";

import { deleteAuthData } from "~/hooks/useAuthSync";
import { logError } from "~/utils/errorLogging";

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
}

// Extend global interface for our auth error handler
declare global {
  // eslint-disable-next-line no-var
  var __handleAuthError: (() => Promise<void>) | undefined;
}

export function AuthErrorBoundary({ children }: AuthErrorBoundaryProps) {
  const { signOut } = useAuth();

  const handleAuthenticationError = async () => {
    try {
      logError("Authentication session expired", new Error("User signed out"));

      // Clear stored auth data
      await deleteAuthData();

      // Sign out from Clerk
      await signOut();

      // Show user-friendly message
      toast.error("Your session has expired. Please sign in again.");

      // Redirect to sign in
      router.replace("/sign-in");
    } catch (error) {
      logError("Error handling authentication error", error);

      // Fallback: force redirect to sign in
      router.replace("/sign-in");
    }
  };

  // Expose the error handler for manual use
  useEffect(() => {
    // Store the handler globally so it can be called from error boundaries
    global.__handleAuthError = handleAuthenticationError;

    return () => {
      global.__handleAuthError = undefined;
    };
  }, []);

  return <>{children}</>;
}
