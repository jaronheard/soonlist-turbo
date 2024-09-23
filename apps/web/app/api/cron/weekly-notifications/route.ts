import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

import { appRouter } from "@soonlist/api";
import { createTRPCContext } from "@soonlist/api/trpc";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await createTRPCContext({ headers: new Headers() });
  const caller = appRouter.createCaller(ctx);

  try {
    await caller.notification.sendWeeklyNotifications();

    return NextResponse.json({ success: true });
  } catch (cause) {
    console.error("Error processing weekly notifications:", cause);

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
