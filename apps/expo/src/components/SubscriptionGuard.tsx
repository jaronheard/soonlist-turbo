import { Redirect } from "expo-router";

import { useRevenueCat } from "~/providers/RevenueCatProvider";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { customerInfo } = useRevenueCat();
  const hasUnlimited = customerInfo?.entitlements.active.unlimited;

  if (!hasUnlimited) {
    return <Redirect href="/onboarding" />;
  }

  return <>{children}</>;
}
