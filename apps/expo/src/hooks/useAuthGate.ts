import { useEffect } from "react";
import { usePathname, useRouter } from "expo-router";
import { useConvexAuth } from "convex/react";

import { useAppStore } from "~/store";

// Paths an unauthenticated user may view. Anything else (event/[id],
// list/[slug], [username], batch/[batchId], settings, add, new, share-setup,
// etc.) requires a signed-in account.
const PUBLIC_PATHS = new Set<string>([
  "/",
  "/feed",
  "/following",
  "/discover",
  "/sign-in",
  "/sign-in-email",
  "/sign-up-email",
  "/verify-email",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
    return true;
  }
  return false;
}

export function useAuthGate() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const pathname = usePathname();
  const hasSeenOnboarding = useAppStore((s) => s.hasSeenOnboarding);
  const router = useRouter();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    if (isPublicPath(pathname)) return;

    router.replace(hasSeenOnboarding ? "/sign-in" : "/(onboarding)/onboarding");
  }, [isAuthenticated, isLoading, pathname, hasSeenOnboarding, router]);
}
