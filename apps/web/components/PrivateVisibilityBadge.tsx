import { EyeOff } from "lucide-react";

import { cn } from "~/lib/utils";

export function PrivateVisibilityBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-neutral-4/70 px-2 py-0.5 text-xs font-medium text-neutral-2",
        className,
      )}
    >
      <EyeOff className="size-3" aria-hidden="true" />
      Private
    </span>
  );
}
