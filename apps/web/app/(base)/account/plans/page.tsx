import React from "react";
import { auth } from "@clerk/nextjs/server";

import { Pricing } from "~/app/(marketing)/components";
import { api } from "~/trpc/server";

export const metadata = {
  title: "Plans | Soonlist",
  openGraph: {
    title: "Plans | Soonlist",
  },
};

export default async function Page() {
  const { sessionClaims } = auth().protect({
    unauthenticatedUrl: "/sign-up",
    unauthorizedUrl: "/",
  });

  const checkoutUrlsForPlans = await api.stripe.getSubscriptionCheckoutUrls();
  const customerPortalUrl = await api.stripe.getCustomerPortalUrl();
  const checkoutUrls = checkoutUrlsForPlans.reduce(
    (acc, curr) => ({ ...acc, [curr.plan]: curr.redirectURL }),
    {},
  );

  // Fetch taken emojis
  const { takenEmojis } = await api.user.getAllTakenEmojis();

  const currentPlanStatus =
    sessionClaims.publicMetadata?.plan?.status || "no plan";
  const planActive =
    currentPlanStatus === "active" || currentPlanStatus === "trialing";
  const currentPlan = planActive
    ? sessionClaims.publicMetadata?.plan?.name || "free"
    : "free";

  return (
    <Pricing
      checkoutUrls={checkoutUrls}
      currentPlan={currentPlan}
      planActive={planActive}
      customerPortalUrl={customerPortalUrl}
      takenEmojis={takenEmojis}
    />
  );
}
