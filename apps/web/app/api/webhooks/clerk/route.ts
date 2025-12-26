import type { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";

import { env } from "~/env";

export const dynamic = "force-dynamic";

/**
 * Clerk Webhook Handler
 *
 * This route receives webhooks from Clerk and forwards them to Convex.
 * The Convex backend handles all user creation/update/deletion logic.
 *
 * Flow:
 * 1. Clerk sends webhook (user.created, user.updated, user.deleted)
 * 2. This route verifies the webhook signature
 * 3. Forwards the verified payload to Convex /clerk-webhook endpoint
 * 4. Returns Convex's response status
 */

async function forwardToConvex(
  body: string,
  svixHeaders: {
    "svix-id": string;
    "svix-timestamp": string;
    "svix-signature": string;
  },
): Promise<{ ok: boolean; status: number; message: string }> {
  // Use custom HTTP endpoint URL for production, otherwise use standard domain replacement
  const convexUrl =
    env.NEXT_PUBLIC_CONVEX_SITE_URL_PROD ||
    env.NEXT_PUBLIC_CONVEX_URL.replace(/\.convex\.cloud$/, ".convex.site");

  try {
    const response = await fetch(`${convexUrl}/clerk-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "svix-id": svixHeaders["svix-id"],
        "svix-timestamp": svixHeaders["svix-timestamp"],
        "svix-signature": svixHeaders["svix-signature"],
      },
      body: body,
    });

    const message = await response.text();

    if (!response.ok) {
      console.error("Failed to sync to Convex:", {
        status: response.status,
        message,
        convexUrl,
      });
    }

    return {
      ok: response.ok,
      status: response.status,
      message,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown network error";
    console.error("Network error forwarding to Convex:", {
      error: errorMessage,
      convexUrl,
    });
    return {
      ok: false,
      status: 502,
      message: `Network error: ${errorMessage}`,
    };
  }
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = env.CLERK_WEBHOOK_SECRET;

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = (await req.json()) as Record<string, unknown>;
  const body = JSON.stringify(payload);

  // Verify the webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Invalid webhook signature", {
      status: 400,
    });
  }

  // Validate event has required data
  if (!evt.data.id) {
    console.error("No user ID found in webhook data");
    return new Response("No user ID found in webhook data", {
      status: 400,
    });
  }

  // Forward to Convex and return its response
  const result = await forwardToConvex(body, {
    "svix-id": svix_id,
    "svix-timestamp": svix_timestamp,
    "svix-signature": svix_signature,
  });

  if (!result.ok) {
    return new Response(`Convex sync failed: ${result.message}`, {
      status: result.status,
    });
  }

  return new Response("Webhook processed successfully", { status: 201 });
}
