import type { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";

import { env } from "~/env";

export const dynamic = "force-dynamic";

async function forwardToConvex(
  body: string,
  svixHeaders: {
    "svix-id": string;
    "svix-timestamp": string;
    "svix-signature": string;
  },
): Promise<{ ok: boolean; status: number; message: string }> {
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

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  const payload = (await req.json()) as Record<string, unknown>;
  const body = JSON.stringify(payload);

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

  if (!evt.data.id) {
    console.error("No user ID found in webhook data");
    return new Response("No user ID found in webhook data", {
      status: 400,
    });
  }

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
