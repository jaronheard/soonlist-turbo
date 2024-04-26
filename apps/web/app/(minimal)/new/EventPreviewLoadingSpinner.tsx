"use client";
import { EventLoadingText } from "./EventLoadingText";

// this is a simple loading spinner component that takes a className prop for sizing
export function EventPreviewLoadingSpinner({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center ${className} flex-col gap-4 pt-2`}
    >
      <EventLoadingText />
      <div className="size-10 animate-spin rounded-full border-b-2 border-gray-400"></div>
    </div>
  );
}
