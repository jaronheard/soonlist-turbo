import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-04-10",
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (req === null)
    throw new Error(`Missing userId or request`, { cause: { req } });

  const stripeSignature = req.headers.get("stripe-signature");

  if (stripeSignature === null) throw new Error("stripeSignature is null");

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      stripeSignature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Error constructing event:", error);
    if (error instanceof Error)
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        },
      );
  }

  if (event === undefined) throw new Error(`event is undefined`);
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const updatedUser = await clerkClient.users.updateUserMetadata(
        event.data.object.metadata?.userId || "",
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
      const updatedUser = await clerkClient.users.updateUserMetadata(
        event.data.object.metadata.userId || "",
        {
          publicMetadata: {
            plan: {
              name: event.data.object.metadata.plan,
              productId: subscription.items.data[0]?.plan.product,
              status: subscription.status,
              id: subscription.items.data[0]?.plan.id,
            },
          },
        },
      );

      console.log("customer.subscription.created", updatedUser.publicMetadata);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;

      const updatedUser = await clerkClient.users.updateUserMetadata(
        event.data.object.metadata.userId || "",
        {
          publicMetadata: {
            plan: {
              name: event.data.object.metadata.plan,
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
        event.data.object.metadata.userId || "",
        {
          publicMetadata: {
            stripe: {
              customerId: subscription.customer,
            },
            plan: {
              name: event.data.object.metadata.plan,
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
