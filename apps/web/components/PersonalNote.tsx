import React from "react";
import { cn } from "@/lib/utils";

const colors = [
  // "bg-accent-blue",
  "bg-accent-red/40",
  "bg-accent-orange/40",
  "bg-accent-green/40",
];

const getRainbowColorFromString = (initials: string) => {
  return colors[initials.charCodeAt(0) % colors.length];
};

export function PersonalNote({
  text,
  className,
}: {
  text?: string;
  className?: string;
}) {
  if (!text) return null;
  return (
    <div
      className={cn(
        "relative w-max max-w-full rounded-3xl p-2 px-3 pt-3 align-text-top font-heading text-xl font-semibold text-neutral-2",
        getRainbowColorFromString(text),
        className
      )}
    >
      <div className="absolute -left-2 top-2 font-heading text-4xl font-normal text-primary">
        &ldquo;
      </div>
      {text}
    </div>
  );
}
