import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Clerk, useAuth, useUser } from "@clerk/clerk-expo";
import { useConvexAuth } from "convex/react";
import { usePostHog } from "posthog-react-native";

import { useSignOut } from "./useSignOut";
import { getAccessGroup } from "~/utils/getAccessGroup";
import { logDebug, logError } from "~/utils/errorLogging";

// Key for tracking auth recovery attempts
const AUTH_RECOVERY_ATTEMPTS_KEY = "auth_recovery_attempts";
const MAX_RECOVERY_ATTEMPTS = 3;
const RECOVERY_ATTEMPT_RESET_TIME = 1000 * 60 * 60; // 1 hour

/**
 * Hook to manage authentication state and handle recovery from invalid states
 * 
 * This hook monitors the authentication state across Clerk and Convex,
 * detects inconsistencies, and attempts to recover from them automatically.
 */
export function useAuthStateManager() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const signOut = useSignOut();
  const posthog = usePostHog();
  const [isRecovering, setIsRecovering] = useState(false);

  // Monitor auth state and handle inconsistencies
  useEffect(() => {
    // Skip if still loading
    if (isLoading) return;

    // Skip if recovering is in progress
    if (isRecovering) return;

    // Check for inconsistent auth state
    const checkAuthState = async () => {
      try {
        // Case 1: Clerk says signed in but Convex says not authenticated
        if (isSignedIn && !isAuthenticated) {
          logDebug("Auth state inconsistency detected", {
            isSignedIn,
            isAuthenticated,
            userId: user?.id,
          });

          // Try to recover by validating the token
          await attemptRecovery();
        }
      } catch (error) {
        logError("Error checking auth state", error);
      }
    };

    void checkAuthState();
  }, [isSignedIn, isAuthenticated, isLoading, isRecovering, user?.id]);

  // Function to attempt recovery from invalid auth state
  const attemptRecovery = async () => {
    setIsRecovering(true);
    
    try {
      logDebug("Attempting auth recovery");
      
      // Check recovery attempts to prevent infinite loops
      const attemptsData = await SecureStore.getItemAsync(AUTH_RECOVERY_ATTEMPTS_KEY);
      let attempts = { count: 0, timestamp: 0 };
      
      if (attemptsData) {
        try {
          attempts = JSON.parse(attemptsData);
        } catch (e) {
          // Reset if data is corrupted
          attempts = { count: 0, timestamp: 0 };
        }
      }
      
      // Reset attempts if it's been more than the reset time
      const now = Date.now();
      if (now - attempts.timestamp > RECOVERY_ATTEMPT_RESET_TIME) {
        attempts = { count: 0, timestamp: now };
      }
      
      // If too many attempts, force sign out
      if (attempts.count >= MAX_RECOVERY_ATTEMPTS) {
        logDebug("Too many recovery attempts, forcing sign out");
        posthog.capture("auth_recovery_failed", {
          attempts: attempts.count,
        });
        
        // Show alert to user
        Alert.alert(
          "Authentication Issue",
          "We're having trouble with your login session. Please sign in again.",
          [
            {
              text: "Sign Out",
              onPress: async () => {
                await signOut();
                router.replace("/sign-in");
              },
            },
          ]
        );
        
        setIsRecovering(false);
        return;
      }
      
      // Increment attempts
      attempts.count += 1;
      attempts.timestamp = now;
      await SecureStore.setItemAsync(
        AUTH_RECOVERY_ATTEMPTS_KEY,
        JSON.stringify(attempts)
      );
      
      // Try to get a fresh token
      if (isSignedIn) {
        // Force token refresh
        const token = await getToken({ template: "convex" });
        
        if (!token) {
          logDebug("Failed to get fresh token during recovery");
          throw new Error("Failed to get fresh token");
        }
        
        logDebug("Successfully refreshed token during recovery");
        
        // If we got a token, wait for Convex to update
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // If Clerk session exists but is invalid, try to reload it
        if (Clerk.session) {
          try {
            await Clerk.session.reload();
            logDebug("Successfully reloaded Clerk session");
          } catch (error) {
            logError("Failed to reload Clerk session", error);
          }
        }
        
        // Reset recovery attempts on success
        if (token) {
          await SecureStore.setItemAsync(
            AUTH_RECOVERY_ATTEMPTS_KEY,
            JSON.stringify({ count: 0, timestamp: now })
          );
        }
      }
    } catch (error) {
      logError("Auth recovery failed", error);
      
      // If recovery fails, redirect to sign-in
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/sign-in");
      }
    } finally {
      setIsRecovering(false);
    }
  };

  // Function to reset recovery attempts counter
  const resetRecoveryAttempts = async () => {
    await SecureStore.setItemAsync(
      AUTH_RECOVERY_ATTEMPTS_KEY,
      JSON.stringify({ count: 0, timestamp: Date.now() })
    );
  };

  return {
    isRecovering,
    attemptRecovery,
    resetRecoveryAttempts,
  };
}

