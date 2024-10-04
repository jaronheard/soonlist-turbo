import React from "react";
import { auth } from "@clerk/nextjs/server";

import { FoundingMemberPricing } from "~/components/FoundingMemberPricing";
import { api } from "~/trpc/server";

export const metadata = {
  title: "Plans | Soonlist",
  openGraph: {
    title: "Plans | Soonlist",
  },
};

export default async function Page() {
  const { userId } = auth();
  const isLoggedIn = !!userId;

  let checkoutUrls: Record<string, string> = {};
  let customerPortalUrl: string | undefined;
  let currentPlan = "free";
  let planActive = false;
  let takenEmojis: string[] = [];

  if (isLoggedIn) {
    // User is logged in
    const checkoutUrlsForPlans = await api.stripe.getSubscriptionCheckoutUrls();
    customerPortalUrl = await api.stripe.getCustomerPortalUrl();
    checkoutUrls = checkoutUrlsForPlans.reduce(
      (acc, curr) => ({ ...acc, [curr.plan]: curr.redirectURL }),
      {},
    );

    const { takenEmojis: fetchedEmojis } = await api.user.getAllTakenEmojis();
    takenEmojis = fetchedEmojis;

    const { sessionClaims } = auth();
    const currentPlanStatus =
      sessionClaims?.publicMetadata?.plan?.status || "no plan";
    planActive =
      currentPlanStatus === "active" || currentPlanStatus === "trialing";
    currentPlan = planActive
      ? sessionClaims?.publicMetadata?.plan?.name || "free"
      : "free";
  } else {
    // User is not logged in
    const publicCheckoutUrls =
      await api.stripe.getPublicSubscriptionCheckoutUrls();
    checkoutUrls = publicCheckoutUrls.reduce(
      (acc, curr) => ({ ...acc, [curr.plan]: curr.redirectURL }),
      {},
    );

    // Fetch taken emojis for public view
    const { takenEmojis: fetchedEmojis } = await api.user.getAllTakenEmojis();
    takenEmojis = fetchedEmojis;
  }

  return (
    <FoundingMemberPricing
      checkoutUrls={checkoutUrls}
      currentPlan={currentPlan}
      planActive={planActive}
      customerPortalUrl={customerPortalUrl}
      takenEmojis={takenEmojis}
    />
  );
}
