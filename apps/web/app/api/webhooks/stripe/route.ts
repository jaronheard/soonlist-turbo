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

type HandledStripeEvent =
  | Stripe.CheckoutSessionCompletedEvent
  | Stripe.CustomerSubscriptionCreatedEvent
  | Stripe.CustomerSubscriptionUpdatedEvent
  | Stripe.CustomerSubscriptionDeletedEvent;

function isHandledStripeEvent(
  event: Stripe.Event,
): event is HandledStripeEvent {
  return (
    event.type === "checkout.session.completed" ||
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  );
}

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  if (typeof customer === "string") return customer;
  return customer?.id ?? null;
}

function getSubscriptionPlanMetadata(subscription: Stripe.Subscription) {
  const firstItem = subscription.items.data[0];
  const plan = firstItem?.plan;
  const productId =
    typeof plan?.product === "string"
      ? plan.product
      : (plan?.product?.id ?? null);

  return {
    id: plan?.id ?? null,
    name: subscription.metadata.plan ?? null,
    productId,
    status: subscription.status,
    trialStartDate: subscription.trial_start
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null,
  };
}

export async function POST(req: NextRequest) {
  const stripeSignature = req.headers.get("stripe-signature");

  if (stripeSignature === null) throw new Error("stripeSignature is null");

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      stripeSignature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Error constructing event:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to construct Stripe event";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      },
    );
  }

  if (!isHandledStripeEvent(event)) {
    console.warn(`Unhandled event type: ${event.type}`);
    return NextResponse.json({ message: "unhandled event" }, { status: 200 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;

      if (!userId) {
        return NextResponse.json(
          {
            error: "Missing userId in Stripe checkout session metadata",
          },
          {
            status: 400,
          },
        );
      }

      const clerk = await clerkClient();
      const updatedUser = await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
          stripe: {
            customerId: getCustomerId(session.customer),
          },
        },
      });
      console.log("checkout.session.completed", updatedUser.publicMetadata);
      break;
    }
    case "customer.subscription.created": {
      const subscription = event.data.object;
      const userId = subscription.metadata.userId;

      if (!userId) {
        return NextResponse.json(
          {
            error: "Missing userId in Stripe subscription metadata",
          },
          {
            status: 400,
          },
        );
      }

      const clerk = await clerkClient();
      const updatedUser = await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
          plan: getSubscriptionPlanMetadata(subscription),
        },
      });

      console.log("customer.subscription.created", updatedUser.publicMetadata);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const userId = subscription.metadata.userId;

      if (!userId) {
        return NextResponse.json(
          {
            error: "Missing userId in Stripe subscription metadata",
          },
          {
            status: 400,
          },
        );
      }

      const clerk = await clerkClient();
      const updatedUser = await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
          plan: getSubscriptionPlanMetadata(subscription),
        },
      });
      console.log("customer.subscription.updated", updatedUser.publicMetadata);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const userId = subscription.metadata.userId;

      if (!userId) {
        return NextResponse.json(
          {
            error: "Missing userId in Stripe subscription metadata",
          },
          {
            status: 400,
          },
        );
      }

      const clerk = await clerkClient();
      const updatedUser = await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
          stripe: {
            customerId: getCustomerId(subscription.customer),
          },
          plan: getSubscriptionPlanMetadata(subscription),
        },
      });
      console.log("customer.subscription.deleted", updatedUser.publicMetadata);
      break;
    }
  }

  return NextResponse.json({ status: 200, message: "success" });
}
