import type { PropsWithChildren } from "react";
import type { CustomerInfo } from "react-native-purchases";
import { createContext, useContext, useEffect, useState } from "react";
import Purchases from "react-native-purchases";
import { useAuth } from "@clerk/clerk-expo";

import { initializeRevenueCat } from "~/lib/revenue-cat";

interface RevenueCatContextType {
  isInitialized: boolean;
  customerInfo: CustomerInfo | null;
  login: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(
  undefined,
);

export function RevenueCatProvider({ children }: PropsWithChildren) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const { userId } = useAuth();

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
  }, [userId]);

  async function login(userId: string) {
    try {
      const { customerInfo } = await Purchases.logIn(userId);
      setCustomerInfo(customerInfo);
    } catch (error) {
      console.error("Error logging in to RevenueCat:", error);
      throw error;
    }
  }

  async function logout() {
    try {
      await Purchases.logOut();
      setCustomerInfo(null);
    } catch (error) {
      console.error("Error logging out from RevenueCat:", error);
      throw error;
    }
  }

  return (
    <RevenueCatContext.Provider
      value={{
        isInitialized,
        customerInfo,
        login,
        logout,
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
