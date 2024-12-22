import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

import { appRouter } from "@soonlist/api";
import { createTRPCContext } from "@soonlist/api/trpc";

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
    // Pass the CRON_SECRET to the sendWeeklyNotifications procedure
    await caller.notification.sendCapturedNotifications({
      cronSecret: process.env.CRON_SECRET || "",
    });

    return NextResponse.json({ success: true });
  } catch (cause) {
    console.error("Error processing captured notifications:", cause);

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
