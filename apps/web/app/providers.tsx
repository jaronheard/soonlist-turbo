"use client";

import { Suspense } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { posthog } from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

import ContextProvider from "~/context/ContextProvider";
import { env } from "~/env";
import { IntercomProvider } from "~/lib/intercom/IntercomProvider";

if (typeof window !== "undefined" && process.env.NODE_ENV !== "development") {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: `https://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/app`,
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
  });
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: { colorPrimary: "rgb(90, 50, 251)", borderRadius: "16px" },
      }}
    >
      <Suspense>
        <IntercomProvider> </IntercomProvider>
      </Suspense>
      <ContextProvider>{children}</ContextProvider>
    </ClerkProvider>
  );
}
