import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

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

  const { userId } = await auth();

  const protocol = url.protocol;
  const baseUrl = env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || url.origin;

  // TODO: Implement Stripe webhook handling in Convex
  // For now, just redirect based on auth status
  if (userId) {
    // User is signed in - redirect to get-started
    return NextResponse.redirect(`${protocol}//${baseUrl}/get-started`);
  } else {
    // User is not signed in - redirect to install page
    return NextResponse.redirect(
      `${protocol}//${baseUrl}/install?session_id=${sessionId}`,
    );
  }
}
