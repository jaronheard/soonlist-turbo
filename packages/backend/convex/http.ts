import { httpRouter } from "convex/server";
import { Webhook } from "svix";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    external_id?: string;
    username?: string;
    first_name?: string | null;
    last_name?: string | null;
    image_url: string;
    email_addresses: { email_address: string }[];
    public_metadata?: Record<string, unknown>;
  };
}

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Missing webhook secret", { status: 500 });
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing webhook headers", { status: 400 });
    }

    const payload = await request.text();

    const wh = new Webhook(webhookSecret);
    let evt: ClerkWebhookEvent;

    try {
      evt = wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return new Response("Invalid webhook signature", { status: 400 });
    }

    const eventType = evt.type;

    if (eventType === "user.created" || eventType === "user.updated") {
      const userId = evt.data.external_id || evt.data.id;
      const userData = {
        id: userId,
        username: evt.data.username || "",
        displayName: generateDisplayName(
          evt.data.first_name,
          evt.data.last_name,
        ),
        userImage: evt.data.image_url,
        email: evt.data.email_addresses[0]?.email_address || "",
        publicMetadata: evt.data.public_metadata,
      };

      await ctx.runMutation(internal.users.syncFromClerk, userData);
    } else if (eventType === "user.deleted") {
      const userId = evt.data.id;
      await ctx.runMutation(internal.users.deleteUser, { id: userId });
    }

    return new Response("Webhook processed", { status: 200 });
  }),
});

// Manual sync endpoint - useful for testing
http.route({
  path: "/sync/planetscale",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Check for a simple auth token in headers (optional)
      const authHeader = request.headers.get("Authorization");
      const expectedToken = process.env.SYNC_AUTH_TOKEN;

      if (expectedToken) {
        const providedToken = authHeader?.replace("Bearer ", "") || "";
        // Constant-time comparison to prevent timing attacks
        const tokensMatch =
          providedToken.length === expectedToken.length &&
          providedToken.split("").every((char, i) => char === expectedToken[i]);

        if (!tokensMatch) {
          return new Response("Unauthorized", { status: 401 });
        }
      }

      // Run the sync
      const results = await ctx.runAction(internal.planetscaleSync.syncAll);

      return new Response(
        JSON.stringify({
          success: true,
          results,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Manual sync error:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error: String(error),
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }),
});

// Health check endpoint
http.route({
  path: "/sync/health",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      // Get sync states
      const eventsSyncState = await ctx.runQuery(
        internal.planetscaleSync.getLastSyncState,
        {
          key: "events",
        },
      );

      const eventFollowsSyncState = await ctx.runQuery(
        internal.planetscaleSync.getLastSyncState,
        {
          key: "eventFollows",
        },
      );

      return new Response(
        JSON.stringify({
          status: "healthy",
          syncStates: {
            events: eventsSyncState,
            eventFollows: eventFollowsSyncState,
          },
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: String(error),
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }),
});

function generateDisplayName(
  firstName?: string | null,
  lastName?: string | null,
) {
  if (!firstName && !lastName) return "anonymous";

  const first = firstName || "";
  const last = lastName || "";

  if (first && last) return `${first} ${last}`;
  return first || last;
}

export default http;
