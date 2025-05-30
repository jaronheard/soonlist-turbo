import { useCallback } from "react";
import { ConvexError } from "convex/values";

import { logError } from "~/utils/errorLogging";

export function useConvexErrorHandler() {
  const handleConvexError = useCallback((error: unknown) => {
    // Check if this is a Convex authentication error
    if (error instanceof ConvexError) {
      const errorData = error.data as Record<string, unknown> | undefined;

      // Check for Clerk authentication errors
      if (
        errorData?.code === "signed_out" ||
        (typeof errorData?.message === "string" &&
          (errorData.message.includes("You are signed out") ||
            errorData.message.includes("Status:401")))
      ) {
        logError("Convex authentication error detected", error);

        // Call the global auth error handler if available
        if (global.__handleAuthError) {
          void global.__handleAuthError();
        }

        return true; // Indicates this was an auth error
      }
    }

    // Check for other error formats
    if (error && typeof error === "object") {
      const errorObj = error as Record<string, unknown>;

      if (
        errorObj.code === "signed_out" ||
        (typeof errorObj.message === "string" &&
          (errorObj.message.includes("You are signed out") ||
            errorObj.message.includes("Status:401")))
      ) {
        logError("Authentication error detected", error);

        if (global.__handleAuthError) {
          void global.__handleAuthError();
        }

        return true;
      }
    }

    return false; // Not an auth error
  }, []);

  return { handleConvexError };
}
