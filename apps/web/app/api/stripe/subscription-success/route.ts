import { NextResponse } from "next/server";

import { appRouter } from "@soonlist/api";
import { createTRPCContext } from "@soonlist/api/trpc";

import { env } from "~/env";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing session_id parameter" },
      { status: 400 },
    );
  }

  const ctx = await createTRPCContext({ headers: req.headers });
  const caller = appRouter.createCaller(ctx);

  const protocol = url.protocol;
  const baseUrl = env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || url.origin;

  try {
    if (ctx.currentUser) {
      // User is signed in - current users
      await caller.stripe.handleSuccessfulCheckoutSignedIn({ sessionId });
      return NextResponse.redirect(`${protocol}//${baseUrl}/get-started`);
    } else {
      // User is not signed in - new users
      // Skipping handling successful checkout, which invites user to create an account
      // await caller.stripe.handleSuccessfulCheckout({ sessionId });
      // Instead just redirect to install page
      return NextResponse.redirect(
        `${protocol}//${baseUrl}/install?session_id=${sessionId}`,
      );
    }
  } catch (error) {
    console.error("Error handling successful checkout:", error);
    return NextResponse.json(
      { error: "Error processing subscription" },
      { status: 500 },
    );
  }
}
