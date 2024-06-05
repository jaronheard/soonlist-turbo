import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const stripeRouter = createTRPCRouter({
  getSubscriptionCheckoutURL: protectedProcedure
    .input(z.object({ plan: z.enum(["personal", "pro"]) }))
    .query(async ({ ctx, input }) => {
      const plans = {
        personal: {
          name: "Personal",
          priceId: process.env.STRIPE_PRICE_ID_PERSONAL_MONTHLY || "",
        },
        pro: {
          name: "Pro",
          priceId: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || "",
        },
      };

      const planPriceId = plans[input.plan].priceId;

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2024-04-10",
      });

      const url = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
          {
            price: planPriceId,
            quantity: 1,
          },
        ],

        success_url: `${url}/get-started`,
        cancel_url: `${url}/account/plans`,
        subscription_data: {
          metadata: {
            userId: ctx.auth.userId,
          },
          trial_period_days: 14,
        },
      });

      if (!checkoutSession.url) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Could not create checkout message",
        });
      }

      return { redirectURL: checkoutSession.url };
    }),
});
