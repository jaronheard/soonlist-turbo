import type { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { eq, inArray } from "drizzle-orm";
import { Webhook } from "svix";

import { db } from "@soonlist/db";
import {
  comments,
  eventFollows,
  events,
  listFollows,
  lists,
  userFollows,
  users,
} from "@soonlist/db/schema";

import { env } from "~/env";

export const dynamic = "force-dynamic";

// Helper function to generate display name
function generateDisplayName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  if (!firstName && !lastName) return "anonymous";

  const first = firstName || "";
  const last = lastName || "";

  if (first && last) return `${first} ${last}`;
  return first || last;
}

async function forwardToConvex(
  body: string,
  headers: {
    "svix-id": string;
    "svix-timestamp": string;
    "svix-signature": string;
  },
) {
  try {
    const convexUrl = env.NEXT_PUBLIC_CONVEX_URL.replace(
      /\.convex\.cloud$/,
      ".convex.site",
    );
    const response = await fetch(`${convexUrl}/clerk-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "svix-id": headers["svix-id"],
        "svix-timestamp": headers["svix-timestamp"],
        "svix-signature": headers["svix-signature"],
      },
      body: body,
    });

    if (!response.ok) {
      console.error("Failed to sync to Convex:", await response.text());
    }
  } catch (error) {
    console.error("Error syncing to Convex:", error);
    // Don't throw - we don't want to fail the MySQL sync if Convex sync fails
  }
}

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  // different for each environment
  const WEBHOOK_SECRET = env.CLERK_WEBHOOK_SECRET;

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = (await req.json()) as Record<string, unknown>;
  const body = JSON.stringify(payload);

  // Create a new SVIX instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  if (evt) {
    // 👉 Parse the incoming event body into a ClerkWebhook object
    try {
      // 👉 `webhook.type` is a string value that describes what kind of event we need to handle

      // 👉 If the type is "user.updated" the important values in the database will be updated in the users table
      if (!evt.data.id) {
        throw new Error("No user ID found in webhook data");
      }

      if (evt.type === "user.updated") {
        const userId = evt.data.external_id || evt.data.id || "";

        // Check if user already exists
        const existingUser = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        // Prepare update data
        const updateData: {
          displayName: string;
          userImage: string;
          email: string;
          publicMetadata?: Record<string, unknown>;
          username?: string;
        } = {
          displayName: generateDisplayName(
            evt.data.first_name,
            evt.data.last_name,
          ),
          userImage: evt.data.image_url,
          email: evt.data.email_addresses[0]?.email_address || "",
          publicMetadata: evt.data.public_metadata,
        };

        // Only update username if provided by Clerk
        if (evt.data.username && evt.data.username.trim() !== "") {
          updateData.username = evt.data.username;
        }

        await db.update(users).set(updateData).where(eq(users.id, userId));

        // Forward to Convex after successful MySQL update
        await forwardToConvex(body, {
          "svix-id": svix_id,
          "svix-timestamp": svix_timestamp,
          "svix-signature": svix_signature,
        });
      }

      // 👉 If the type is "user.created" create a record in the users table
      if (evt.type === "user.created") {
        const userId = evt.data.external_id || evt.data.id || "";

        // Username should already be set during signup
        const username = evt.data.username || "";

        await db.insert(users).values({
          id: userId,
          username,
          displayName: generateDisplayName(
            evt.data.first_name,
            evt.data.last_name,
          ),
          userImage: evt.data.image_url,
          email: evt.data.email_addresses[0]?.email_address || "",
          publicMetadata: evt.data.public_metadata,
        });

        // Forward to Convex after successful MySQL insert
        await forwardToConvex(body, {
          "svix-id": svix_id,
          "svix-timestamp": svix_timestamp,
          "svix-signature": svix_signature,
        });
      }

      // 👉 If the type is "user.deleted", delete the user record and associated blocks
      if (evt.type === "user.deleted") {
        const userId = evt.data.id; // doesn't exist for deleted users
        await Promise.all([
          db.delete(users).where(eq(users.id, userId)),
          db.delete(comments).where(eq(comments.userId, userId)),
          db.delete(events).where(eq(events.userId, userId)),
          db.delete(eventFollows).where(eq(eventFollows.userId, userId)),
          db.delete(lists).where(eq(lists.userId, userId)),
          db.delete(listFollows).where(eq(listFollows.userId, userId)),
          db.delete(userFollows).where(eq(userFollows.followerId, userId)),
          db.delete(userFollows).where(eq(userFollows.followingId, userId)),
          // TODO: doesn't delete eventToLists, but should
        ]);

        // Forward to Convex after successful MySQL deletes
        await forwardToConvex(body, {
          "svix-id": svix_id,
          "svix-timestamp": svix_timestamp,
          "svix-signature": svix_signature,
        });
      }

      return new Response("", { status: 201 });
    } catch (err) {
      console.error(err);
      return new Response("Error occured -- processing webhook data", {
        status: 500,
      });
    }
  }
}
