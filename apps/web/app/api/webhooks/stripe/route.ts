import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";

import { env } from "~/env";

export const dynamic = "force-dynamic";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});
const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

// Helper to POST purchase details to RevenueCat
async function postToRevenueCat(fetchToken: string, appUserId: string) {
  try {
    const res = await fetch("https://api.revenuecat.com/v1/receipts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Platform": "stripe",
        // Use NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY instead of REVENUECAT_STRIPE_APP_PUBLIC_API_KEY
        Authorization: `Bearer ${env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        app_user_id: appUserId,
        fetch_token: fetchToken,
      }),
    });

    if (!res.ok) {
      console.error("Failed to send data to RevenueCat:", await res.json());
    } else {
      console.log("Successfully posted to RevenueCat.");
    }
  } catch (error) {
    console.error("RevenueCat API error:", error);
  }
}

export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!req) throw new Error("Missing request");

  const stripeSignature = req.headers.get("stripe-signature");
  if (!stripeSignature) throw new Error("stripeSignature is null");

  let event: Stripe.Event | undefined;

  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      stripeSignature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Error constructing event:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (!event) throw new Error("event is undefined");

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      // Example of storing the Stripe customer ID in Clerk
      const updatedUser = await clerkClient.users.updateUserMetadata(
        session.metadata?.userId || "",
        {
          publicMetadata: {
            stripe: {
              customerId: session.customer,
            },
          },
        },
      );
      console.log("checkout.session.completed", updatedUser.publicMetadata);
      break;
    }

    case "customer.subscription.created": {
      const subscription = event.data.object;

      // Update the user in Clerk with relevant plan information
      const updatedUser = await clerkClient.users.updateUserMetadata(
        subscription.metadata.userId || "",
        {
          publicMetadata: {
            plan: {
              name: subscription.metadata.plan,
              productId: subscription.items.data[0]?.plan.product,
              status: subscription.status,
              id: subscription.items.data[0]?.plan.id,
            },
          },
        },
      );
      console.log("customer.subscription.created", updatedUser.publicMetadata);

      // Send subscription to RevenueCat
      // Passing subscription.id (which starts with 'sub_') and the user ID
      await postToRevenueCat(
        subscription.id,
        subscription.metadata.userId || "",
      );

      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;

      const updatedUser = await clerkClient.users.updateUserMetadata(
        subscription.metadata.userId || "",
        {
          publicMetadata: {
            plan: {
              name: subscription.metadata.plan,
              productId: subscription.items.data[0]?.plan.product,
              status: subscription.status,
              id: subscription.items.data[0]?.plan.id,
            },
          },
        },
      );
      console.log("customer.subscription.updated", updatedUser.publicMetadata);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;

      const updatedUser = await clerkClient.users.updateUserMetadata(
        subscription.metadata.userId || "",
        {
          publicMetadata: {
            stripe: {
              customerId: subscription.customer,
            },
            plan: {
              name: subscription.metadata.plan,
              productId: subscription.items.data[0]?.plan.product,
              status: subscription.status,
              id: subscription.items.data[0]?.plan.id,
            },
          },
        },
      );
      console.log("customer.subscription.deleted", updatedUser.publicMetadata);
      break;
    }

    default:
      console.warn(`Unhandled event type: ${event.type}`);
      return NextResponse.json({ status: 200, message: "unhandled event" });
  }

  return NextResponse.json({ status: 200, message: "success" });
}
