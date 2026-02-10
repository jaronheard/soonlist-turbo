import { cn } from ".";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-neutral-3", className)}
      {...props}
    />
  );
}

export { Skeleton };
