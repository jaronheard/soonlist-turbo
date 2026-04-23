import type { PropsWithChildren } from "react";
import type { CustomerInfo } from "react-native-purchases";
import { createContext, useCallback, useContext, useState } from "react";
import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { useAuth } from "@clerk/clerk-expo";
import { useConvexAuth } from "convex/react";
import { usePostHog } from "posthog-react-native";

import { useMountEffect } from "~/hooks/useMountEffect";
import { initializeRevenueCat, setPostHogUserId } from "~/lib/revenue-cat";
import { logError, logMessage } from "~/utils/errorLogging";
import { hapticSuccess, toast } from "~/utils/feedback";
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

  useMountEffect(() => {
    let updateListener: ((customerInfo: CustomerInfo) => void) | undefined;
    let isMounted = true;

    async function initializeRevenueCatOnce() {
      if (isInitialized) return;

      try {
        await initializeRevenueCat();

        const initialDistinctId = posthog.getDistinctId();
        if (initialDistinctId) {
          await setPostHogUserId(initialDistinctId);
        }

        if (!isMounted) return;

        setIsInitialized(true);

        updateListener = (customerInfo: CustomerInfo) => {
          setCustomerInfo(customerInfo);
        };
        Purchases.addCustomerInfoUpdateListener(updateListener);

        if (userId) {
          await loginInternal(userId);
        }
      } catch (error) {
        logError("Failed to initialize RevenueCat", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initializeRevenueCatOnce();

    return () => {
      isMounted = false;
      if (updateListener) {
        Purchases.removeCustomerInfoUpdateListener(updateListener);
      }
    };
  });

  useMountEffect(() => {
    if (isInitialized && isAuthenticated && userId) {
      void loginInternal(userId);
    }
  }, [isInitialized, isAuthenticated, userId]);

  const loginInternal = async (userIdToLogin: string) => {
    if (!isInitialized) {
      logMessage("RevenueCat not initialized yet", { action: "login" });
      return;
    }
    setIsLoading(true);
    try {
      const { customerInfo } = await Purchases.logIn(userIdToLogin);
      setCustomerInfo(customerInfo);

      await setPostHogUserId(userIdToLogin);
    } catch (error) {
      logError("Error logging in to RevenueCat", error, {
        userId: userIdToLogin,
      });
    } finally {
      setIsLoading(false);
    }
  };

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

      const nextDistinctId = posthog.getDistinctId();
      if (nextDistinctId) {
        await setPostHogUserId(nextDistinctId);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("current user is anonymous")
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
  }, [isInitialized, posthog]);

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
          try {
            const updatedCustomerInfo = await Purchases.getCustomerInfo();
            setCustomerInfo(updatedCustomerInfo);
          } catch (error) {
            logError("Error refreshing customer info after purchase", error);
          }

          void hapticSuccess();
          if (hasNotificationPermission) {
            toast.success(
              "Welcome to Soonlist Unlimited!",
              "Thanks for subscribing!",
            );
          } else {
            toast.warning(
              "Welcome to Soonlist Unlimited!",
              "Enable notifications for reminders",
            );
          }
          break;
        default:
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
