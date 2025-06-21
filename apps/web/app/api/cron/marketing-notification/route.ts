import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

import { appRouter } from "@soonlist/api";
import { createTRPCContext } from "@soonlist/api/trpc";

// Need to create this function directly since we can't import from the API
// to avoid circular dependencies
function createDeepLink(path: string): string {
  // Check if we're in development environment
  const isDev = process.env.NODE_ENV !== "production";

  // Get appropriate scheme
  const scheme = isDev ? "soonlist.dev" : "soonlist";

  // Ensure path doesn't start with a slash
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${scheme}://${cleanPath}`;
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Helper function to validate the authorization token
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;
  return authHeader === `Bearer ${expectedToken}`;
}

export async function GET(request: Request) {
  // Check if the request is authorized
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await createTRPCContext({ headers: new Headers() });
  const caller = appRouter.createCaller(ctx);

  try {
    await caller.notification.sendMarketingNotification({
      cronSecret: process.env.CRON_SECRET || "",
      title: "📸 Soonlist Just Got Better!",
      body: "Tap to explore our streamlined capture flow, event stats & more. Not seeing it? Update in TestFlight.",
      data: {
        url: createDeepLink("feed"),
      },
    });

    return NextResponse.json({ success: true });
  } catch (cause) {
    console.error("Error sending marketing notification:", cause);

    if (cause instanceof TRPCError) {
      const httpStatusCode = getHTTPStatusCodeFromError(cause);
      return NextResponse.json(
        { success: false, error: { message: cause.message } },
        { status: httpStatusCode },
      );
    }

    return NextResponse.json(
      { success: false, error: { message: "Internal Server Error" } },
      { status: 500 },
    );
  }
}
