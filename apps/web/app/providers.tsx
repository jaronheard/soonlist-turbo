"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ClerkProvider, useUser } from "@clerk/nextjs";
import { posthog } from "posthog-js";
import { PostHogProvider, usePostHog } from "posthog-js/react";

import ContextProvider from "~/context/ContextProvider";
import { IntercomProvider } from "~/lib/intercom/IntercomProvider";

if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "fake key", {
    api_host: "https://webhook.site/b28f46b2-4164-4d4c-bf24-6072de230b45",
    ui_host: "https://us.posthog.com",
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    loaded: function (ph) {
      // only capture events if vercel is production
      if (process.env.VERCEL_ENV === "production") {
        ph.opt_in_capturing();
      }
      if (process.env.VERCEL_ENV !== "production") {
        ph.opt_out_capturing();
      }
    },
  });
}

export function PostHogPageview(): JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return <></>;
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== "production") {
    return <>{children}</>;
  }
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

const UserAnalytics = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const posthog = usePostHog();
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      return;
    }
    posthog.identify(user.id, {
      email: user.emailAddresses[0]?.emailAddress,
    });
  }, [isLoaded, isSignedIn, posthog, user]);

  return <></>;
};
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: { colorPrimary: "rgb(90, 50, 251)", borderRadius: "16px" },
      }}
    >
      <IntercomProvider>
        <ContextProvider>
          {children}
          {process.env.NODE_ENV === "production" ? <UserAnalytics /> : <></>}
        </ContextProvider>
      </IntercomProvider>
    </ClerkProvider>
  );
}
