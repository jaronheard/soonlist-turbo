"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
// 👉 Import the necessary Clerk hooks
import { useUser } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { usePostHog } from "posthog-js/react";

export default function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  // 👉 Use Convex auth state
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const userId = user?.id;

  // Track pageviews
  useEffect(() => {
    if (process.env.NODE_ENV == "development") {
      return;
    }
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, searchParams, posthog]);

  useEffect(() => {
    if (process.env.NODE_ENV == "development") {
      return;
    }
    // 👉 Check the sign in status and user info,
    //    and identify the user if they aren't already
    if (isAuthenticated && userId && user && !posthog._isIdentified()) {
      // 👉 Identify the user
      posthog.identify(userId, {
        email: user.primaryEmailAddress?.emailAddress,
        username: user.username,
      });
    }

    // 👉 Reset the user if they sign out
    if (!isAuthenticated && posthog._isIdentified()) {
      posthog.reset();
    }
  }, [posthog, user]);

  return null;
}
