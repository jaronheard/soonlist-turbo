// AuthErrorBoundary.tsx
import type { ReactNode } from "react";
import React, { Component, createContext, useContext } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { toast } from "sonner-native";

import { logError } from "~/utils/errorLogging";

type Handler = () => Promise<void>;
const AuthErrCtx = createContext<Handler>(() => Promise.resolve());

interface AuthErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export function useAuthErrorHandler() {
  return useContext(AuthErrCtx);
}

export class AuthErrorBoundary extends Component<
  { children: ReactNode },
  AuthErrorBoundaryState
> {
  static contextType = AuthErrCtx;

  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    logError("UI error", { error, errorInfo });
    void (this.context as Handler)(); // delegate to shared handler
  }

  render() {
    if (this.state.hasError) {
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

  const handleAuthenticationError: Handler = async () => {
    try {
      await signOut(); // clerk flush + revoke
      toast.error("Session expired. Please sign in again.");
    } finally {
      router.replace("/(auth)/sign-in");
    }
  };

  return (
    <AuthErrCtx.Provider value={handleAuthenticationError}>
      <AuthErrorBoundary>{children}</AuthErrorBoundary>
    </AuthErrCtx.Provider>
  );
}
