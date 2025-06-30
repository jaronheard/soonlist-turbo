import type { PropsWithChildren } from "react";
import type { CustomerInfo } from "react-native-purchases";
import { createContext, useCallback, useContext, useState } from "react";
import { Linking } from "react-native";
import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { useAuth } from "@clerk/clerk-expo";
import { useConvexAuth } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { toast } from "sonner-native";

import { useMountEffect } from "~/hooks/useMountEffect";
import { initializeRevenueCat, setPostHogUserId } from "~/lib/revenue-cat";
import { logError, logMessage } from "~/utils/errorLogging";
import { useOneSignal } from "./OneSignalProvider";

interface RevenueCatContextType {
  isInitialized: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  login: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  showProPaywallIfNeeded: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(
  undefined,
);

export function RevenueCatProvider({ children }: PropsWithChildren) {
  "use no memo";

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const { isAuthenticated } = useConvexAuth();
  const { userId } = useAuth();
  const { hasNotificationPermission } = useOneSignal();
  const posthog = usePostHog();

  // Initialize RevenueCat only once when the component mounts
  useMountEffect(() => {
    async function initializeRevenueCatOnce() {
      if (isInitialized) return;

      try {
        await initializeRevenueCat();
        setIsInitialized(true);

        // Only try to log in if there's a userId after initialization
        if (userId) {
          await loginInternal(userId);
        }
      } catch (error) {
        logError("Failed to initialize RevenueCat", error);
      } finally {
        setIsLoading(false);
      }
    }

    void initializeRevenueCatOnce();
  });

  // Handle Clerk user ID changes, but only after initialization
  useMountEffect(() => {
    if (isInitialized && isAuthenticated && userId) {
      void loginInternal(userId);
    }
  }, [isInitialized, isAuthenticated, userId]);

  // Internal login function that doesn't depend on the PostHog context
  const loginInternal = async (userIdToLogin: string) => {
    if (!isInitialized) {
      logMessage("RevenueCat not initialized yet", { action: "login" });
      return;
    }
    setIsLoading(true);
    try {
      const { customerInfo } = await Purchases.logIn(userIdToLogin);
      setCustomerInfo(customerInfo);

      // After successful login, synchronize the PostHog ID once
      const distinctId = posthog.getDistinctId();
      if (distinctId) {
        await setPostHogUserId(distinctId);
      }
    } catch (error) {
      logError("Error logging in to RevenueCat", error, {
        userId: userIdToLogin,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Public login function exposed in the context
  const login = useCallback(async (userIdToLogin: string) => {
    await loginInternal(userIdToLogin);
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    if (!isInitialized) {
      logMessage("RevenueCat not initialized yet", { action: "logout" });
      return;
    }
    setIsLoading(true);
    try {
      await Purchases.logOut();
      setCustomerInfo(null);
    } catch (error) {
      // Ignore errors about logging out anonymous users - this is expected
      if (
        error instanceof Error &&
        error.message?.includes("current user is anonymous")
      ) {
        logMessage(
          "Attempted to logout anonymous user from RevenueCat - this is expected",
        );
      } else {
        logError("Error logging out from RevenueCat", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const showProPaywallIfNeeded = useCallback(async () => {
    if (!isInitialized) {
      logMessage("RevenueCat not initialized yet", {
        action: "showProPaywallIfNeeded",
      });
      return;
    }
    try {
      const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: "unlimited",
      });
      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          // Send welcome notification if notifications are enabled
          if (hasNotificationPermission) {
            // Using OneSignal for notifications
            // The server will handle sending to all of the user's devices
            toast.success(
              "Welcome to Soonlist Unlimited! 🎉\n\nThanks for subscribing!",
              {
                duration: 5000,
              },
            );
          } else {
            toast.info(
              "Welcome to Soonlist Unlimited! 🎉\n\n Enable notifications to get reminders before your trial ends",
              {
                action: {
                  label: "Settings",
                  onClick: () => {
                    void Linking.openSettings();
                  },
                },
              },
            );
          }
          break;
        default:
          // Not purchased, or user cancelled
          break;
      }
    } catch (err) {
      logError("Error presenting paywall", err);
    }
  }, [isInitialized, hasNotificationPermission]);

  return (
    <RevenueCatContext.Provider
      value={{
        isInitialized,
        isLoading,
        customerInfo,
        login,
        logout,
        showProPaywallIfNeeded,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (context === undefined) {
    throw new Error("useRevenueCat must be used within a RevenueCatProvider");
  }
  return context;
}
