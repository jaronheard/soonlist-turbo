"use client";

import React from "react";
import Link from "next/link";
import { CheckIcon } from "lucide-react";

import { cn } from "@soonlist/ui";
import { Badge } from "@soonlist/ui/badge";
import { Button, buttonVariants } from "@soonlist/ui/button";

interface PricingProps {
  checkoutUrls: Record<string, string>;
  currentPlan: string;
  planActive: boolean;
  customerPortalUrl?: string;
  takenEmojis: string[];
  hideEmojiDetails?: boolean; // New prop
}

const tiers = [
  {
    name: "Founding Member",
    id: "personal",
    href: "#",
    priceAnnually: "$29.99",
    description: "All Your Possibilities, Organized",
    features: [
      "Capture unlimited events",
      "Early access to iOS app",
      "Shape product development",
      "Unique profile emoji",
      "Price for life (70% off)",
    ],
    mostPopular: true,
    free: false,
    soon: false,
  },
];

export function FoundingMemberPricing({
  checkoutUrls,
  currentPlan,
  planActive,
  customerPortalUrl,
  takenEmojis,
  hideEmojiDetails = false, // Default to false
}: PricingProps) {
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
            Limited Availability
          </h2>
          <p className="mt-2 text-4xl font-bold text-neutral-1">
            Only 💯&nbsp;Founding Member Spots&nbsp;🎈
          </p>
          {!hideEmojiDetails && (
            <>
              <p className="mt-4 text-lg text-neutral-2">
                Pick a signature emoji to pair with your profile picture
              </p>
              {takenEmojis.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-lg font-semibold text-neutral-1">
                    Join these other founding members:
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
        {tiersWithStatus.map((tier, tierIdx) => (
          <div
            key={tier.id}
            className={cn(
              tier.mostPopular ? "lg:z-10 lg:rounded-b-none" : "lg:mt-8",
              tierIdx === 0 ? "lg:rounded-r-none" : "",
              tierIdx === tiers.length - 1 ? "lg:rounded-l-none" : "",
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
                  <Badge variant={"default"}>Current plan</Badge>
                ) : tier.mostPopular ? (
                  <Badge variant={"secondary"}>{remainingSpots} left</Badge>
                ) : null}
              </div>
              <p className="mt-4 text-lg leading-6 text-neutral-2">
                {tier.description}
              </p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="font-heading text-4xl font-bold tracking-tight text-gray-900">
                  {tier.priceAnnually}
                </span>
                <span className="text-lg font-semibold leading-6 text-neutral-2">
                  /year
                </span>
              </p>
              {tier.mostPopular && (
                <>
                  <div className="p-2"></div>
                  <Badge variant={"outline"}>🌈 NOTAFLOF available</Badge>
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
            <div className="mt-8">
              {tier.soon && (
                <Button aria-describedby={tier.id} className="w-full" disabled>
                  Coming soon
                </Button>
              )}
              {!tier.soon &&
                !tier.active &&
                (!customerPortalUrl || tier.id !== "free") && (
                  <Link
                    aria-describedby={tier.id}
                    className={cn("w-full", buttonVariants({ size: "lg" }))}
                    href={`${checkoutUrls[tier.id] || "/new"}`}
                    scroll={false}
                  >
                    Join Soonlist
                  </Link>
                )}
              {!tier.soon && tier.active && tier.id !== "free" && (
                <Link
                  aria-describedby={tier.id}
                  className={cn("w-full", buttonVariants({ variant: "link" }))}
                  href={customerPortalUrl || "/account/plans"}
                >
                  Manage Plan
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
