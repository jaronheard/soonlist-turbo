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
  const checkoutUrls = checkoutUrlsForPlans.reduce(
    (acc, curr) => ({ ...acc, [curr.plan]: curr.redirectURL }),
    {},
  );

  return (
    <>
      {JSON.stringify(sessionClaims)}
      <Pricing checkoutUrls={checkoutUrls} />
    </>
  );
}
