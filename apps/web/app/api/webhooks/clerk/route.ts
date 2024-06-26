import type { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
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

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  // different for each environment
  const WEBHOOK_SECRET = env.CLERK_WEBHOOK_SECRET;

  // Get the headers
  const headerPayload = headers();
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
      if (evt.type === "user.updated") {
        await db
          .update(users)
          .set({
            username: evt.data.username || "",
            displayName: `${evt.data.first_name} ${evt.data.last_name}`,
            userImage: evt.data.image_url,
            email: evt.data.email_addresses[0]?.email_address || "",
            publicMetadata: evt.data.public_metadata,
          })
          .where(eq(users.id, evt.data.id));
      }

      // 👉 If the type is "user.created" create a record in the users table
      if (evt.type === "user.created") {
        await db.insert(users).values({
          id: evt.data.id,
          username: evt.data.username || "",
          displayName: `${evt.data.first_name} ${evt.data.last_name}`,
          userImage: evt.data.image_url,
          email: evt.data.email_addresses[0]?.email_address || "",
          publicMetadata: evt.data.public_metadata,
        });
      }

      // 👉 If the type is "user.deleted", delete the user record and associated blocks
      if (evt.type === "user.deleted") {
        await Promise.all([
          db.delete(users).where(eq(users.id, evt.data.id || "")),
          db.delete(comments).where(eq(comments.userId, evt.data.id || "")),
          db.delete(events).where(eq(events.userId, evt.data.id || "")),
          db
            .delete(eventFollows)
            .where(eq(eventFollows.userId, evt.data.id || "")),
          db.delete(lists).where(eq(lists.userId, evt.data.id || "")),
          db
            .delete(listFollows)
            .where(eq(listFollows.userId, evt.data.id || "")),
          db
            .delete(userFollows)
            .where(eq(userFollows.followerId, evt.data.id || "")),
          db
            .delete(userFollows)
            .where(eq(userFollows.followingId, evt.data.id || "")),
          // TODO: doesn't delete eventToLists, but should
        ]);
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
