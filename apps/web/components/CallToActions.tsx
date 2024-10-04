"use client";

import React from "react";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { CalendarPlus, Ticket } from "lucide-react";

import { Button } from "@soonlist/ui/button";

export function CTAButton() {
  return (
    <>
      <SignedOut>
        <Button asChild size="lg">
          <Link href={"/join"} scroll={false}>
            <Ticket className="mr-2 size-4"></Ticket>
            <span className="inline">&nbsp;Start showing up</span>
          </Link>
        </Button>
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
