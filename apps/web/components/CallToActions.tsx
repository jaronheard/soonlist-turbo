"use client";

import React from "react";
import Link from "next/link";
import { CalendarPlus, Star } from "lucide-react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function CTAButton() {
  return (
    <>
      <SignedOut>
        <Button asChild>
          <Link href={"/early-access"}>
            <Star className="mr-2 size-4"></Star>
            Early Access
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
