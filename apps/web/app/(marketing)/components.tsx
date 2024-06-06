"use client";

import { Suspense } from "react";
import Link from "next/link";
import { CheckIcon } from "lucide-react";

import { cn } from "@soonlist/ui";
import { Badge, badgeVariants } from "@soonlist/ui/badge";
import { Button, buttonVariants } from "@soonlist/ui/button";

import { newMessage } from "~/lib/intercom/intercom";

export const AutoPlayVideo = ({ src, ...rest }: { src: string }) => {
  return (
    <video autoPlay muted loop playsInline {...rest}>
      <source src={src} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
};

export const NotaflofBadge = () => {
  return (
    <button
      className={badgeVariants({ variant: "secondary" })}
      onClick={() =>
        newMessage(
          "NOTAFLOF request. I'd like to pay ... and my project is ...",
        )
      }
    >
      🌈 NOTAFLOF for community projects.
    </button>
  );
};
export const tiers = [
  {
    name: "Free",
    id: "free",
    href: "#",
    priceMonthly: "$0",
    description: "A few lists for your public events.",
    features: ["Add up to 100 public events", "3 public event lists"],
    mostPopular: false,
    free: true,
    soon: false,
  },
  {
    name: "Personal",
    id: "personal",
    href: "#",
    priceMonthly: "$7",
    description: "Unlimited public and private events and lists.",
    features: [
      "Unlimited public events",
      "Unlimited private events",
      "Unlimited event lists",
      "Supporter badge",
    ],
    mostPopular: true,
    free: false,
    soon: false,
  },
  {
    name: "Pro (coming soon)",
    id: "pro",
    href: "#",
    priceMonthly: "$35",
    description: "Customize, integrate, and brand your events and lists.",
    features: [
      "Unlimited events & lists",
      "Customize prompts & fields",
      "Embeddable lists",
      "Custom colors & branding",
      "Priority support",
    ],
    mostPopular: false,
    free: false,
    soon: true,
  },
];

export function Pricing({
  checkoutUrls,
  currentPlan,
  planActive,
  customerPortalUrl,
}: {
  checkoutUrls?: Record<string, string>;
  currentPlan?: string;
  planActive?: boolean;
  customerPortalUrl?: string;
}) {
  const tiersWithStatus = tiers.map((tier) => ({
    ...tier,
    current: tier.id === currentPlan,
    active: tier.id === currentPlan && planActive,
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="font-heading text-4xl font-bold leading-[1.08333] tracking-tight text-gray-800 md:text-5xl">
          Choose your plan
        </h1>
        <p className="mt-6 text-xl leading-7.5 text-gray-400 md:text-2xl md:leading-9">
          Soonlist is an independent, community-supported platform. We don't
          sell your attention or data.
        </p>
      </div>
      <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
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
                  <Badge variant={"secondary"}>Most popular</Badge>
                ) : null}
              </div>
              <p className="mt-4 text-lg leading-6 text-neutral-2">
                {tier.description}
              </p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="font-heading text-4xl font-bold tracking-tight text-gray-900">
                  {tier.priceMonthly}
                </span>
                <span className="text-lg font-semibold leading-6 text-neutral-2">
                  /month
                </span>
              </p>
              {tier.mostPopular && (
                <>
                  <div className="p-2"></div>
                  <Suspense
                    fallback={
                      <Badge variant={"secondary"}>
                        🌈 NOTAFLOF for community projects.
                      </Badge>
                    }
                  >
                    <NotaflofBadge />
                  </Suspense>
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
                    className={cn("w-full", buttonVariants())}
                    href={checkoutUrls?.[tier.id] || "/new"}
                  >
                    Get started
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
