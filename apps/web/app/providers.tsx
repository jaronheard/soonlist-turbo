"use client";

import { Suspense, useState } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { posthog } from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import superjson from "superjson";

import ContextProvider from "~/context/ContextProvider";
import { env } from "~/env";
import { api } from "~/lib/api";
import { convex } from "~/lib/convex";
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
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: `/api/trpc`,
          transformer: superjson,
        }),
      ],
    }),
  );

  return (
    <ClerkProvider
      appearance={{
        variables: { colorPrimary: "rgb(90, 50, 251)", borderRadius: "16px" },
      }}
    >
      <api.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <Suspense>
              <IntercomProvider> </IntercomProvider>
            </Suspense>
            <ContextProvider>{children}</ContextProvider>
          </ConvexProviderWithClerk>
        </QueryClientProvider>
      </api.Provider>
    </ClerkProvider>
  );
}
