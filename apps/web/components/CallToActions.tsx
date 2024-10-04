"use client";

import React from "react";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { CalendarPlus } from "lucide-react";

import { Button } from "@soonlist/ui/button";

export function CTAButton() {
  return (
    <>
      <SignedOut>
        <CTAButtonMembership />
      </SignedOut>
      <SignedIn>
        <Button asChild size="lg">
          <Link href={"/new"} scroll={false}>
            <CalendarPlus className="mr-2 size-4"></CalendarPlus>
            Add<span className="inline">&nbsp;Event</span>
          </Link>
        </Button>
      </SignedIn>
    </>
  );
}

interface CTAButtonMembershipProps {
  children?: React.ReactNode;
}

export function CTAButtonMembership({
  children = "Join Soonlist",
}: CTAButtonMembershipProps) {
  return (
    <Button asChild size="lg">
      <Link href={"/new"} scroll={false}>
        {children}
      </Link>
    </Button>
  );
}
