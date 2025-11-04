"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { usePostHog } from "posthog-js/react";

import { api } from "@soonlist/backend/convex/_generated/api";

export default function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  // Get current user from Convex
  const currentUser = useQuery(api.users.getCurrentUser);
  const isSignedIn = !!currentUser;
  const userId = currentUser?.id;

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
    if (isSignedIn && userId && currentUser && !posthog._isIdentified()) {
      const anonymousId = posthog.get_distinct_id();

      if (anonymousId && anonymousId !== userId) {
        posthog.alias(userId);
      }

      posthog.identify(userId, {
        email: currentUser.email,
        username: currentUser.username,
      });
    }

    // 👉 Reset the user if they sign out
    if (!isSignedIn && posthog._isIdentified()) {
      posthog.reset();
    }
  }, [posthog, currentUser, isSignedIn, userId]);

  return null;
}
