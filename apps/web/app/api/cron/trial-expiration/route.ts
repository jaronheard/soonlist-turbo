import { NextResponse } from "next/server";

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

  // Trial expiration reminders are handled by Convex cron jobs
  // This endpoint exists for backward compatibility
  return NextResponse.json({
    success: true,
    message: "Trial expiration reminders are handled by Convex cron jobs",
  });
}
