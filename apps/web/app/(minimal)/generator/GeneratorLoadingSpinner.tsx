"use client";

import Link from "next/link";
import { Download } from "lucide-react";

import { Button } from "@soonlist/ui/button";

import { EventLoadingText } from "../new/EventLoadingText";

export function GeneratorLoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center ${className} flex-col gap-6 pt-2`}
    >
      <EventLoadingText />
      <div className="size-10 animate-spin rounded-full border-b-2 border-gray-400"></div>

      <div className="mt-4 rounded-lg border border-neutral-3 p-4 text-center">
        <h3 className="mb-2 text-lg font-semibold text-neutral-1">
          Get the Soonlist App
        </h3>
        <p className="mb-4 text-sm text-neutral-2">
          Capture more events, organize your calendar, and never miss out on
          what matters.
        </p>
        <Link
          href="https://apps.apple.com/us/app/soonlist/id6450652802"
          target="_blank"
        >
          <Button className="w-full">
            <Download className="mr-2 size-4" /> Download Now
          </Button>
        </Link>
      </div>
    </div>
  );
}
