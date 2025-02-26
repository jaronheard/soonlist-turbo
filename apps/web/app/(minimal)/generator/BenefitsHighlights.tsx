"use client";

import { Calendar, Share2, Smartphone } from "lucide-react";

export function BenefitsHighlights() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="flex flex-col items-center rounded-lg border border-neutral-3 p-4 text-center">
        <Calendar className="mb-2 size-8 text-primary" />
        <h3 className="mb-1 font-semibold text-neutral-1">Add to Calendar</h3>
        <p className="text-sm text-neutral-2">
          Easily add events to your calendar with one click
        </p>
      </div>

      <div className="flex flex-col items-center rounded-lg border border-neutral-3 p-4 text-center">
        <Share2 className="mb-2 size-8 text-primary" />
        <h3 className="mb-1 font-semibold text-neutral-1">Send to Anyone</h3>
        <p className="text-sm text-neutral-2">
          Share events with friends without requiring login
        </p>
      </div>

      <div className="flex flex-col items-center rounded-lg border border-neutral-3 p-4 text-center">
        <Smartphone className="mb-2 size-8 text-primary" />
        <h3 className="mb-1 font-semibold text-neutral-1">Get the App</h3>
        <p className="text-sm text-neutral-2">
          Capture more events with our mobile app
        </p>
      </div>
    </div>
  );
}
