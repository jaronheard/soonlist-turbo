import type { PropsWithChildren } from "react";
import type { CustomerInfo } from "react-native-purchases";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { useAuth } from "@clerk/clerk-expo";

import { initializeRevenueCat } from "~/lib/revenue-cat";

interface RevenueCatContextType {
  isInitialized: boolean;
  customerInfo: CustomerInfo | null;
  login: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  showProPaywallIfNeeded: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(
  undefined,
);

export function RevenueCatProvider({ children }: PropsWithChildren) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const { userId } = useAuth();

  const login = useCallback(
    async (userId: string) => {
      if (!isInitialized) {
        console.warn("RevenueCat is not initialized yet");
        return;
      }
      try {
        const { customerInfo } = await Purchases.logIn(userId);
        setCustomerInfo(customerInfo);
      } catch (error) {
        console.error("Error logging in to RevenueCat:", error);
        throw error;
      }
    },
    [isInitialized],
  );

  useEffect(() => {
    async function initialize() {
      try {
        // Initialize with anonymous ID first
        await initializeRevenueCat();
        setIsInitialized(true);

        // If user is already logged in, identify them
        if (userId) {
          await login(userId);
        }
      } catch (error) {
        console.error("Failed to initialize RevenueCat:", error);
      }
    }

    void initialize();
  }, [login, userId]);

  async function logout() {
    if (!isInitialized) {
      console.warn("RevenueCat is not initialized yet");
      return;
    }
    try {
      await Purchases.logOut();
      setCustomerInfo(null);
    } catch (error) {
      console.error("Error logging out from RevenueCat:", error);
      throw error;
    }
  }

  async function showProPaywallIfNeeded() {
    if (!isInitialized) {
      console.warn("RevenueCat is not initialized yet");
      return;
    }
    console.log("showProPaywallIfNeeded");
    try {
      const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: "unlimited",
      });
      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          // User now has Pro; update local customerInfo automatically via listener
          break;
        default:
          // Not purchased, or user cancelled
          break;
      }
    } catch (err) {
      console.error("Error presenting paywall:", err);
    }
  }

  return (
    <RevenueCatContext.Provider
      value={{
        isInitialized,
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
