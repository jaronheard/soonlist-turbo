"use client";

import { Calendar, Share2, Smartphone } from "lucide-react";

export function BenefitsHighlights() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="flex flex-col items-center rounded-lg border border-neutral-3 p-4 text-center">
        <Calendar className="mb-2 size-8 text-primary" />
        <h3 className="font-semibold text-neutral-1">Add to Calendar</h3>
      </div>

      <div className="flex flex-col items-center rounded-lg border border-neutral-3 p-4 text-center">
        <Share2 className="mb-2 size-8 text-primary" />
        <h3 className="font-semibold text-neutral-1">Send to Anyone</h3>
      </div>

      <div className="flex flex-col items-center rounded-lg border border-neutral-3 p-4 text-center">
        <Smartphone className="mb-2 size-8 text-primary" />
        <h3 className="font-semibold text-neutral-1">Get the App</h3>
      </div>
    </div>
  );
}
