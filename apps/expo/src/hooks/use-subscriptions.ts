import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { useEffect, useState } from "react";
import Purchases from "react-native-purchases";

interface UseSubscriptionsReturn {
  isLoading: boolean;
  offerings: PurchasesPackage[] | null;
  currentSubscription: Record<string, unknown>;
  purchasePackage: (pack: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
}

export function useSubscriptions(): UseSubscriptionsReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesPackage[] | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<
    Record<string, unknown>
  >({});

  useEffect(() => {
    void loadOfferings();
    const listener = setupSubscriptionListener();
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  async function loadOfferings() {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null) {
        setOfferings(offerings.current.availablePackages);
      }
    } catch (error) {
      console.error("Error loading offerings:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function setupSubscriptionListener() {
    return Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
      setCurrentSubscription(info.entitlements.active);
    });
  }

  async function purchasePackage(pack: PurchasesPackage) {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pack);
      setCurrentSubscription(customerInfo.entitlements.active);
    } catch (error) {
      console.error("Error purchasing package:", error);
      throw error;
    }
  }

  async function restorePurchases() {
    try {
      const customerInfo = await Purchases.restorePurchases();
      setCurrentSubscription(customerInfo.entitlements.active);
    } catch (error) {
      console.error("Error restoring purchases:", error);
      throw error;
    }
  }

  return {
    isLoading,
    offerings,
    currentSubscription,
    purchasePackage,
    restorePurchases,
  };
}
