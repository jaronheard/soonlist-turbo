import { useEffect } from "react";
import { Redirect, usePathname } from "expo-router";

export default function UnmatchedRoute() {
  const pathname = usePathname();

  useEffect(() => {
    console.warn(`Attempted to access unmatched route: ${pathname}`);
  }, [pathname]);

  // Redirect to the home screen or another appropriate route
  return <Redirect href="/onboarding" />;
}
