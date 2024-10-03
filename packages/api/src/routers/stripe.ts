import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

export const stripeRouter = createTRPCRouter({
  getSubscriptionCheckoutUrls: protectedProcedure.query(async ({ ctx }) => {
    const plans = {
      personal: {
        name: "personal",
        priceId: process.env.STRIPE_PRICE_ID_PERSONAL_ANNUAL || "",
      },
      // pro: {
      //   name: "pro",
      //   priceId: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || "",
      // },
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
          success_url: `${protocol}://${url}/account/emoji-picker`,
          cancel_url: `${protocol}://${url}/account/plans`,
          metadata: {
            userId: ctx.user.id,
          },
          subscription_data: {
            metadata: {
              userId: ctx.user.id,
              plan: planKey,
            },
          },
          allow_promotion_codes: true,
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
  getPublicSubscriptionCheckoutUrls: publicProcedure.query(async () => {
    const plans = {
      personal: {
        name: "personal",
        priceId: process.env.STRIPE_PRICE_ID_PERSONAL_ANNUAL || "",
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
          success_url: `${protocol}://${url}/account/handle-checkout?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${protocol}://${url}/account/plans`,
          metadata: {
            plan: planKey,
          },
          subscription_data: {
            metadata: {
              plan: planKey,
            },
          },
          allow_promotion_codes: true,
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
  handleCheckoutAndInvite: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        email: z.string().email(),
      }),
    )
    .mutation(async ({ input }) => {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2024-04-10",
      });

      // Retrieve the checkout session
      const session = await stripe.checkout.sessions.retrieve(input.sessionId);

      if (session.status !== "complete") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Checkout session is not complete",
        });
      }

      // Create an invitation using Clerk
      try {
        const invitation = await clerkClient.invitations.createInvitation({
          emailAddress: input.email,
          publicMetadata: {
            plan: session.metadata?.plan,
            stripeCustomerId: session.customer as string,
          },
          redirectUrl: `${protocol}://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/sign-up`,
        });

        return { success: true, invitationId: invitation.id };
      } catch (error) {
        console.error("Error creating invitation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create invitation",
        });
      }
    }),
});
