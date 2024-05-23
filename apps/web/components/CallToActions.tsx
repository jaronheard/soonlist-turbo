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
        <Button asChild size="lg">
          <Link href={"/early-access"}>
            <CalendarPlus className="mr-2 size-4"></CalendarPlus>
            Add your first event
          </Link>
        </Button>
      </SignedOut>
      <SignedIn>
        <Button asChild>
          <Link href={"/new"}>
            <CalendarPlus className="mr-2 size-4"></CalendarPlus>
            Add<span className="inline">&nbsp;Event</span>
          </Link>
        </Button>
      </SignedIn>
    </>
  );
}
