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

      // Helper function to generate display name
      const generateDisplayName = (
        firstName?: string | null,
        lastName?: string | null,
      ) => {
        if (!firstName && !lastName) return "anonymous";

        const first = firstName || "";
        const last = lastName || "";

        if (first && last) return `${first} ${last}`;
        return first || last;
      };

      // Helper function to generate unique username (adapted from Convex)
      const generateUniqueUsername = async (
        firstName?: string | null,
        lastName?: string | null,
        email?: string,
      ): Promise<string> => {
        // Clean and format names for username (slug-like)
        const slugify = (text: string | null | undefined) => {
          if (!text) return "";
          return text
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
            .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
            .replace(/-+/g, "-"); // Replace multiple hyphens with single
        };

        const cleanFirst = slugify(firstName);
        const cleanLast = slugify(lastName);
        const emailPrefix = email ? slugify(email.split("@")[0]) : "";

        // Create a list of username candidates in order of preference
        const candidates: string[] = [];

        // 1. Try just firstname (most common for social platforms)
        if (cleanFirst) {
          candidates.push(cleanFirst);
        }

        // 2. Try firstname + lastname variations
        if (cleanFirst && cleanLast) {
          candidates.push(`${cleanFirst}${cleanLast}`); // johnsmith
          candidates.push(`${cleanFirst}-${cleanLast}`); // john-smith
          candidates.push(`${cleanFirst}.${cleanLast}`); // john.smith
          candidates.push(`${cleanFirst}_${cleanLast}`); // john_smith
        }

        // 3. Try just lastname
        if (cleanLast) {
          candidates.push(cleanLast);
        }

        // 4. Try email prefix
        if (
          emailPrefix &&
          emailPrefix !== cleanFirst &&
          emailPrefix !== cleanLast
        ) {
          candidates.push(emailPrefix);
        }

        // 5. Try combinations with first initial
        if (cleanFirst && cleanLast) {
          candidates.push(`${cleanFirst[0]}${cleanLast}`); // jsmith
          candidates.push(`${cleanFirst[0]}-${cleanLast}`); // j-smith
        }

        // Ensure minimum length for all candidates
        const validCandidates = candidates
          .filter((username) => username.length >= 3)
          .slice(0, 10); // Limit to first 10 candidates

        // Try each candidate in order
        for (const candidate of validCandidates) {
          const existing = await db.query.users.findFirst({
            where: eq(users.username, candidate),
          });

          if (!existing) {
            return candidate;
          }
        }

        // If all candidates are taken, add numbers to the best candidate
        const baseUsername = validCandidates[0] || "user";

        // First try sequential numbers 1-99
        for (let i = 1; i < 100; i++) {
          const candidateUsername = `${baseUsername}${i}`;

          const existing = await db.query.users.findFirst({
            where: eq(users.username, candidateUsername),
          });

          if (!existing) {
            return candidateUsername;
          }
        }

        // Then try random 3-digit numbers
        for (let attempts = 0; attempts < 50; attempts++) {
          const randomNum = Math.floor(Math.random() * 900) + 100; // 100-999
          const candidateUsername = `${baseUsername}${randomNum}`;

          const existing = await db.query.users.findFirst({
            where: eq(users.username, candidateUsername),
          });

          if (!existing) {
            return candidateUsername;
          }
        }

        // Ultimate fallback: use timestamp
        return `${baseUsername}${Date.now()}`;
      };

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

        // Only update username if provided by Clerk or if user doesn't have one yet
        if (evt.data.username && evt.data.username.trim() !== "") {
          updateData.username = evt.data.username;
        } else if (
          !existingUser?.username ||
          existingUser.username.trim() === ""
        ) {
          // Generate username if user doesn't have one
          updateData.username = await generateUniqueUsername(
            evt.data.first_name,
            evt.data.last_name,
            evt.data.email_addresses[0]?.email_address,
          );
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

        // Generate username if not provided by Clerk
        let username = evt.data.username;
        if (!username || username.trim() === "") {
          username = await generateUniqueUsername(
            evt.data.first_name,
            evt.data.last_name,
            evt.data.email_addresses[0]?.email_address,
          );
        }

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
