import { TRPCError } from "@trpc/server";
import Stripe from "stripe";

import { createTRPCRouter, protectedProcedure } from "../trpc";

const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

export const stripeRouter = createTRPCRouter({
  getSubscriptionCheckoutUrls: protectedProcedure.query(async ({ ctx }) => {
    const plans = {
      personal: {
        name: "personal",
        priceId: process.env.STRIPE_PRICE_ID_PERSONAL_MONTHLY || "",
      },
      pro: {
        name: "pro",
        priceId: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || "",
      },
    };

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2024-04-10",
    });

    const url = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

    const checkoutUrls = await Promise.all(
      Object.keys(plans).map(async (planKey) => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const plan = plans[planKey as keyof typeof plans];
        const checkoutSession = await stripe.checkout.sessions.create({
          mode: "subscription",
          line_items: [
            {
              price: plan.priceId,
              quantity: 1,
            },
          ],
          success_url: `${protocol}://${url}/new`,
          cancel_url: `${protocol}://${url}/account/plans`,
          metadata: {
            userId: ctx.user.id,
          },
          subscription_data: {
            metadata: {
              userId: ctx.user.id,
              plan: planKey,
            },
            trial_period_days: 14,
          },
        });

        if (!checkoutSession.url) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Could not create checkout session for ${plan.name} plan`,
          });
        }

        return { plan: plan.name, redirectURL: checkoutSession.url };
      }),
    );

    return checkoutUrls;
  }),
  getCustomerPortalUrl: protectedProcedure.query(async ({ ctx }) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2024-04-10",
    });

    const url = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
    const returnUrl = `${protocol}://${url}/account/plans`;
    const userStripe = ctx.user.publicMetadata.stripe as
      | {
          customerId?: string;
        }
      | undefined;
    const customerId = userStripe?.customerId;

    if (!customerId) {
      return undefined;
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return portalSession.url;
  }),
});
