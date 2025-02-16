import { useEffect, useState } from "react";

import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { customerInfo, showProPaywallIfNeeded } = useRevenueCat();
  const hasUnlimited = customerInfo?.entitlements.active.unlimited;
  const hasCompletedOnboarding = useAppStore(
    (state) => state.hasCompletedOnboarding,
  );
  const [isShowingPaywall, setIsShowingPaywall] = useState(false);

  useEffect(() => {
    if (!hasUnlimited && hasCompletedOnboarding && !isShowingPaywall) {
      setIsShowingPaywall(true);
      void showProPaywallIfNeeded().finally(() => {
        setIsShowingPaywall(false);
      });
    }
  }, [
    hasUnlimited,
    hasCompletedOnboarding,
    isShowingPaywall,
    showProPaywallIfNeeded,
  ]);

  return <>{children}</>;
}
