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
    const userEmail = ctx.user.emailAddresses[0]?.emailAddress;

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
          success_url: `${protocol}://${url}/api/stripe/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${protocol}://${url}/account/plans`,
          metadata: {
            userId: ctx.user.id,
            plan: planKey,
          },
          subscription_data: {
            metadata: {
              userId: ctx.user.id,
              plan: planKey,
            },
          },
          allow_promotion_codes: true,
          customer_email: userEmail, // Prefill the user's email
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
          success_url: `${protocol}://${url}/api/stripe/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
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
          customer_email: undefined, // This allows Stripe to collect the email
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
  handleSuccessfulCheckout: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2024-04-10",
      });

      // Retrieve the checkout session
      const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
        expand: ["subscription"],
      });

      if (session.status !== "complete") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Checkout session is not complete",
        });
      }

      const email = session.customer_details?.email;
      const plan = session.metadata?.plan;
      const url = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

      if (!email || !plan) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing email or plan information",
        });
      }

      // Create an invitation using Clerk
      try {
        const subscription = session.subscription as Stripe.Subscription;
        const invitation = await clerkClient.invitations.createInvitation({
          emailAddress: email,
          publicMetadata: {
            stripe: {
              customerId: session.customer as string,
            },
            plan: {
              name: plan,
              productId: subscription.items.data[0]?.plan.product as string,
              status: subscription.status,
              id: subscription.items.data[0]?.plan.id,
            },
          },
          ignoreExisting: true,
          redirectUrl: `${protocol}://${url}/sign-up`,
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
  handleSuccessfulCheckoutSignedIn: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2024-04-10",
      });

      // Retrieve the checkout session
      const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
        expand: ["subscription"],
      });

      console.log("session", session);

      if (session.status !== "complete") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Checkout session is not complete",
        });
      }

      const plan = session.metadata?.plan;

      if (!plan) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing plan information",
        });
      }

      // Update the user's metadata
      try {
        const subscription = session.subscription as Stripe.Subscription;
        await clerkClient.users.updateUser(ctx.user.id, {
          publicMetadata: {
            ...ctx.user.publicMetadata,
            stripe: {
              customerId: session.customer as string,
            },
            plan: {
              name: plan,
              productId: subscription.items.data[0]?.plan.product as string,
              status: subscription.status,
              id: subscription.items.data[0]?.plan.id,
            },
          },
        });

        return { success: true };
      } catch (error) {
        console.error("Error updating user metadata:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user metadata",
        });
      }
    }),
  verifyCheckoutSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2024-04-10",
      });

      try {
        const session = await stripe.checkout.sessions.retrieve(
          input.sessionId,
          {
            expand: ["subscription"],
          },
        );

        if (session.status !== "complete") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Checkout session is not complete",
          });
        }

        return {
          success: true,
          session: {
            id: session.id,
            customerId: session.customer as string,
            customerEmail: session.customer_details?.email,
            plan: session.metadata?.plan,
            subscriptionId: (session.subscription as Stripe.Subscription).id,
            subscriptionStatus: (session.subscription as Stripe.Subscription)
              .status,
          },
        };
      } catch (error) {
        console.error("Error verifying checkout session:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify checkout session",
        });
      }
    }),
});
