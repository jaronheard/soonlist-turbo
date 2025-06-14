"use client";

import React from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { CheckIcon } from "lucide-react";

import { cn } from "@soonlist/ui";
import { Badge } from "@soonlist/ui/badge";
import { Button, buttonVariants } from "@soonlist/ui/button";

interface PricingProps {
  hideEmojiDetails?: boolean;
}

const tiers = [
  {
    name: "Founding Member",
    id: "personal",
    href: "#",
    priceAnnually: "$29.99",
    priceMonthly: "$2.50",
    percentOff: 70,
    description: "All your possibilities, organized",
    features: [
      "Capture unlimited events",
      "Early access to iOS app",
      "Shape product development",
      "Unique profile emoji",
      "Locked-in price forever",
      "Priority access to free codes for friends",
      "$20 referral bonus for each new member",
    ],
    mostPopular: true,
    free: false,
    soon: false,
  },
];

export function FoundingMemberPricing({
  hideEmojiDetails = false,
}: PricingProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  // TODO: Implement Stripe checkout and emoji queries in Convex
  // For now, using placeholder data
  const checkoutUrls = undefined;
  const publicCheckoutUrls = undefined;
  const portalUrl = undefined;
  const emojisData = { takenEmojis: [] };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  // @ts-expect-error - types are wrong
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const currentPlan = user?.publicMetadata.plan?.name || "free";
  // @ts-expect-error - types are wrong
  const planActive = user?.publicMetadata.plan?.status === "active";

  const checkoutUrlsMap: Record<string, string> = isSignedIn
    ? (checkoutUrls as unknown as any[])?.reduce(
        (acc: Record<string, string>, curr: any) => ({ ...acc, [curr.plan]: curr.redirectURL }),
        {} as Record<string, string>,
      ) || {}
    : (publicCheckoutUrls as unknown as any[])?.reduce(
        (acc: Record<string, string>, curr: any) => ({ ...acc, [curr.plan]: curr.redirectURL }),
        {} as Record<string, string>,
      ) || {};

  const takenEmojis = emojisData?.takenEmojis || [];

  const tiersWithStatus = tiers.map((tier) => ({
    ...tier,
    current: tier.id === currentPlan,
    active: tier.id === currentPlan && planActive,
  }));

  const foundingMemberSpots = 100;
  const remainingSpots = foundingMemberSpots - takenEmojis.length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="font-heading text-4xl font-bold leading-[1.08333] tracking-tight text-gray-800 md:text-5xl">
          Become a Founding Member
        </h1>
        <div className="mt-8 rounded-xl bg-accent-orange p-6 text-center">
          <h2 className="font-heading text-2xl font-bold text-interactive-1">
            Limited availability - Ending soon!
          </h2>
          <p className="mt-2 text-4xl font-bold text-neutral-1">
            Only 💯&nbsp;Founding Member spots&nbsp;🎈
          </p>
          {!hideEmojiDetails && (
            <>
              <p className="mt-4 text-lg text-neutral-2">
                Pick a signature emoji to pair with your profile picture
              </p>
              {takenEmojis.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-lg font-semibold text-neutral-1">
                    Join these other Founding Members:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {takenEmojis.map((emoji, index) => (
                      <span
                        key={index}
                        className="text-3xl"
                        title="Founding Member"
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="isolate mx-auto mt-6 grid max-w-md grid-cols-1 gap-y-8 sm:mt-8 lg:mx-0 lg:max-w-none lg:grid-cols-1">
        {tiersWithStatus.map((tier) => (
          <div
            key={tier.id}
            className={cn(
              tier.mostPopular ? "lg:z-10" : "lg:mt-8",
              tier.soon ? "opacity-75" : "",
              "flex flex-col justify-between rounded-xl border border-neutral-3 bg-white p-8 shadow-sm xl:p-10",
              tier.current ? "border-accent-foreground" : "",
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-x-4">
                <h3
                  id={tier.id}
                  className={cn(
                    tier.mostPopular ? "text-interactive-1" : "text-gray-900",
                    "font-heading text-2xl font-semibold leading-8",
                  )}
                >
                  {tier.name}
                </h3>
                {tier.current ? (
                  <Badge variant={"default"}>Current&nbsp;plan</Badge>
                ) : tier.mostPopular ? (
                  <Badge variant={"secondary"}>{remainingSpots} left</Badge>
                ) : null}
              </div>
              <p className="mt-4 text-lg leading-6 text-neutral-2">
                {tier.description}
              </p>
              <p className="mt-6 flex items-center gap-x-3">
                <span className="font-mono text-4xl font-bold tracking-tight text-gray-900">
                  {tier.priceAnnually}
                </span>
                <span className="font-mono text-lg font-semibold leading-6 text-neutral-2">
                  /year
                </span>
                {tier.percentOff && <Badge>{tier.percentOff}%&nbsp;off</Badge>}
              </p>
              <p className="mt-0 flex items-center gap-x-3">
                <span className="font-mono text-lg font-semibold leading-6 text-neutral-2">
                  (Just {tier.priceMonthly} /month)
                </span>
              </p>
              <p className="mt-0 flex items-center gap-x-3">
                <span className="font-mono text-lg font-semibold italic leading-6 text-neutral-2">
                  + Earn $20 for each friend you refer!
                </span>
              </p>
              {tier.mostPopular && (
                <>
                  <div className="p-2"></div>
                  <Link href="mailto:support@soonlist.com?subject=🌈%20NOTAFLOF%20request">
                    <Badge variant={"outline"}>🌈 NOTAFLOF available</Badge>
                  </Link>
                  <Badge variant="gray" className="ml-2">
                    Portland Metro Region only
                  </Badge>
                </>
              )}
              <ul
                role="list"
                className="mt-8 space-y-3 text-lg leading-6 text-neutral-2"
              >
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <CheckIcon
                      className="h-6 w-5 flex-none text-interactive-1"
                      aria-hidden="true"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 animate-pulse text-lg font-semibold text-interactive-1">
              {remainingSpots} spots left • Offer ends on app launch
            </p>
            <div className="mt-8">
              {tier.soon && (
                <Button aria-describedby={tier.id} className="w-full" disabled>
                  Coming soon
                </Button>
              )}
              {!tier.soon &&
                !tier.active &&
                (!portalUrl || tier.id !== "free") && (
                  <Link
                    aria-describedby={tier.id}
                    className={cn("w-full", buttonVariants({ size: "lg" }))}
                    href={`${checkoutUrlsMap[tier.id] || "/new"}`}
                    scroll={false}
                  >
                    Join Soonlist
                  </Link>
                )}
              {!tier.soon && tier.active && tier.id !== "free" && (
                <Link
                  aria-describedby={tier.id}
                  className={cn("w-full", buttonVariants({ variant: "link" }))}
                  href={portalUrl || "/account/plans"}
                >
                  Manage plan
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
