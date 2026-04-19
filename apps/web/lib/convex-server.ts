import "server-only";

import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

import { env } from "~/env";

export async function getAuthenticatedConvex() {
  const convex = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);

  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });

  if (token) {
    convex.setAuth(token);
  }

  return convex;
}

// For routes that never need viewer auth (e.g. crawler-facing OG images).
// Avoids calling Clerk's `auth()`, which touches request cookies and opts the
// containing route out of Next.js's ISR cache — so `revalidate` actually
// amortizes the downstream work instead of re-running on every unfurl.
export function getUnauthenticatedConvex() {
  return new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
}
