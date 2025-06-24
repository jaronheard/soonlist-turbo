// AuthErrorBoundary.tsx
import type { ReactNode } from "react";
import React, {
  Component,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { toast } from "sonner-native";

import { api } from "@soonlist/backend/convex/_generated/api";

import { deleteAuthData } from "~/hooks/useAuthSync";
import { logError } from "~/utils/errorLogging";

type Handler = (error: Error) => Promise<void>;
const AuthErrCtx = createContext<Handler>(() => Promise.resolve());

interface AuthErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  isWaitingForUserSync: boolean;
}

// Helper component to check if user exists in Convex
function UserSyncChecker({
  onUserSynced,
  onUserSyncFailed,
}: {
  onUserSynced: () => void;
  onUserSyncFailed: () => void;
}) {
  const { user: clerkUser } = useUser();
  const convexUser = useQuery(
    api.users.getCurrentUser,
    clerkUser ? {} : "skip",
  );
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 10; // Try for about 30 seconds (3s intervals)

  useEffect(() => {
    // If we have both Clerk user and Convex user data, sync is complete
    if (clerkUser && convexUser) {
      onUserSynced();
      return;
    }

    // If we don't have Clerk user, this is a different authentication issue
    if (!clerkUser) {
      onUserSyncFailed();
      return;
    }

    if (attempts >= maxAttempts) {
      onUserSyncFailed();
      return;
    }

    const timer = setTimeout(() => {
      setAttempts((prev) => prev + 1);
    }, 3000);

    return () => clearTimeout(timer);
  }, [
    clerkUser,
    convexUser,
    attempts,
    onUserSynced,
    onUserSyncFailed,
    maxAttempts,
  ]);

  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="mb-2 text-lg font-semibold text-blue-600">
        Setting up your account...
      </Text>
      <Text className="text-center text-sm text-gray-600">
        Please wait while we sync your account data.
      </Text>
      <Text className="mt-2 text-xs text-gray-500">
        Attempt {attempts + 1} of {maxAttempts}
      </Text>
      {clerkUser?.username && (
        <Text className="mt-1 text-xs text-gray-400">
          Syncing user: {clerkUser.username}
        </Text>
      )}
    </View>
  );
}

export function useAuthErrorHandler() {
  return useContext(AuthErrCtx);
}

// Helper function to check if an error is a user sync issue
function isUserSyncError(error: Error): boolean {
  const errorMessage = error.message || "";
  const errorString = error.toString();

  // Check for ConvexError with "User not found" message
  if (
    errorMessage.includes("User not found") ||
    errorString.includes("User not found")
  ) {
    // Try to parse error data to check for sync issue context
    try {
      const errorWithData = error as Error & { data?: unknown };
      const errorData = errorWithData.data;
      if (errorData && typeof errorData === "object" && errorData !== null) {
        const data = errorData as Record<string, unknown>;
        // If the backend indicates this might be a sync issue, treat it as such
        if (data.possibleSyncIssue === true) {
          return true;
        }
        // Also check if the userName in error matches current user context
        // This helps identify sync issues even without the backend flag
        if (
          data.userName ||
          (data.args &&
            typeof data.args === "object" &&
            data.args !== null &&
            (data.args as Record<string, unknown>).userName)
        ) {
          return true;
        }
      }
    } catch {
      // If we can't parse the error data, fall back to string matching
    }

    // Fallback: if it's a "User not found" error, assume it might be a sync issue
    return true;
  }

  // Check for the specific error pattern from the Sentry log
  if (
    errorMessage.includes("ConvexError") &&
    errorString.includes("User not found")
  ) {
    return true;
  }

  return false;
}

export class AuthErrorBoundary extends Component<
  { children: ReactNode },
  AuthErrorBoundaryState
> {
  static contextType = AuthErrCtx;

  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      isWaitingForUserSync: false,
    };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    const isUserSyncIssue = isUserSyncError(error);

    return {
      hasError: true,
      error,
      isWaitingForUserSync: isUserSyncIssue,
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    logError("UI error", { error, errorInfo });

    const isUserSync = isUserSyncError(error as Error);
    console.log("AuthErrorBoundary caught error:", {
      message: (error as Error)?.message,
      isUserSyncError: isUserSync,
      errorType: typeof error,
    });

    // Only delegate to the sign-out handler if it's not a user sync issue
    if (!isUserSync) {
      void (this.context as Handler)(error as Error);
    }
  }

  handleUserSynced = () => {
    // Reset the error state to retry rendering
    this.setState({
      hasError: false,
      error: undefined,
      isWaitingForUserSync: false,
    });
  };

  handleUserSyncFailed = () => {
    // If user sync failed after multiple attempts, fall back to sign out
    this.setState({ isWaitingForUserSync: false });
    void (this.context as Handler)(
      this.state.error || new Error("User sync failed"),
    );
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isWaitingForUserSync) {
        // Show user sync checker component
        return (
          <UserSyncChecker
            onUserSynced={this.handleUserSynced}
            onUserSyncFailed={this.handleUserSyncFailed}
          />
        );
      }

      // Show generic error for non-sync issues
      return (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="mb-2 text-lg font-semibold text-red-600">
            Something went wrong
          </Text>
          <Text className="text-center text-sm text-gray-600">
            We're redirecting you to sign in again...
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export function AuthErrorProvider({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();

  const handleAuthenticationError: Handler = async (error: Error) => {
    try {
      await deleteAuthData();
      await signOut(); // clerk flush + revoke

      // Show different messages based on error type
      if (isUserSyncError(error)) {
        toast.error("Account setup failed. Please try signing in again.");
      } else {
        toast.error("Session expired. Please sign in again.");
      }
    } finally {
      router.replace("/sign-in");
    }
  };

  return (
    <AuthErrCtx.Provider value={handleAuthenticationError}>
      <AuthErrorBoundary>{children}</AuthErrorBoundary>
    </AuthErrCtx.Provider>
  );
}
