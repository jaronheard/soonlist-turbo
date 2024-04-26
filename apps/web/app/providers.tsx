"use client";

import { posthog } from "posthog-js";
import { PostHogProvider, usePostHog } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ClerkProvider, useUser } from "@clerk/nextjs";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { IntercomProvider } from "@/lib/intercom/IntercomProvider";
import ContextProvider from "@/context/ContextProvider";

if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
    api_host: `${process.env.NEXT_PUBLIC_URL}/ingest`,
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
  });
}

export function PostHogPageview(): JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
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
  if ([process.env.NODE_ENV !== "production"]) {
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
          {process.env.NODE_ENV === "production" ? <SpeedInsights /> : <></>}
          {process.env.NODE_ENV === "production" ? <UserAnalytics /> : <></>}
        </ContextProvider>
      </IntercomProvider>
    </ClerkProvider>
  );
}
