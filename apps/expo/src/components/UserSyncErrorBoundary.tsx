import React, { Component, ReactNode } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { ConvexError } from "convex/values";

interface UserSyncErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryAttempt: number;
  isRetrying: boolean;
}

interface UserSyncErrorBoundaryProps {
  children: ReactNode;
  maxRetries?: number;
  fallback?: ReactNode;
}

/**
 * Error boundary specifically designed to handle "User not found" ConvexErrors
 * that occur during the Clerk-to-Convex user synchronization process.
 * 
 * This boundary will automatically retry when it detects a "User not found" error,
 * showing a friendly "Setting up your account..." message instead of a generic error.
 */
export class UserSyncErrorBoundary extends Component<
  UserSyncErrorBoundaryProps,
  UserSyncErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: UserSyncErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryAttempt: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<UserSyncErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.log("UserSyncErrorBoundary caught error:", error, errorInfo);
    
    // Check if this is a "User not found" error that we should retry
    const isUserNotFoundError = this.isUserNotFoundError(error);
    
    if (isUserNotFoundError && this.state.retryAttempt < (this.props.maxRetries ?? 5)) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private isUserNotFoundError(error: Error): boolean {
    // Check for ConvexError with "User not found" message
    if (error instanceof ConvexError) {
      const message = error.data?.message || error.message;
      return typeof message === "string" && message.includes("User not found");
    }
    
    // Check for regular Error with "User not found" in message
    return error.message?.includes("User not found") ?? false;
  }

  private scheduleRetry = () => {
    const { retryAttempt } = this.state;
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, retryAttempt), 16000);
    
    this.setState({
      isRetrying: true,
    });

    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        retryAttempt: retryAttempt + 1,
        isRetrying: false,
      });
    }, delay);
  };

  render() {
    const { hasError, error, isRetrying, retryAttempt } = this.state;
    const { children, fallback, maxRetries = 5 } = this.props;

    if (hasError && error) {
      const isUserNotFoundError = this.isUserNotFoundError(error);
      
      // If it's a user not found error and we're still retrying
      if (isUserNotFoundError && (isRetrying || retryAttempt < maxRetries)) {
        return (
          <View className="flex-1 items-center justify-center p-6 bg-white">
            <ActivityIndicator size="large" color="#3B82F6" className="mb-4" />
            <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">
              Setting up your account...
            </Text>
            <Text className="text-sm text-gray-600 text-center leading-5">
              We're syncing your account data. This usually takes just a few seconds.
            </Text>
            {retryAttempt > 0 && (
              <Text className="text-xs text-gray-500 mt-2">
                Attempt {retryAttempt + 1} of {maxRetries + 1}
              </Text>
            )}
          </View>
        );
      }
      
      // If we've exhausted retries for user not found error
      if (isUserNotFoundError && retryAttempt >= maxRetries) {
        return (
          <View className="flex-1 items-center justify-center p-6 bg-white">
            <Text className="text-lg font-semibold text-red-600 mb-2 text-center">
              Account Setup Issue
            </Text>
            <Text className="text-sm text-gray-600 text-center leading-5 mb-4">
              We're having trouble setting up your account. Please try signing out and back in.
            </Text>
            <Text className="text-xs text-gray-500 text-center">
              If this continues, please contact support.
            </Text>
          </View>
        );
      }
      
      // For other types of errors, use the fallback or default error UI
      if (fallback) {
        return <>{fallback}</>;
      }
      
      return (
        <View className="flex-1 items-center justify-center p-6 bg-white">
          <Text className="text-lg font-semibold text-red-600 mb-2 text-center">
            Something went wrong
          </Text>
          <Text className="text-sm text-gray-600 text-center leading-5">
            Please try refreshing the app.
          </Text>
        </View>
      );
    }

    return <>{children}</>;
  }
}

