import { Skeleton } from "@soonlist/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl">
      {/* User info skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="p-2" />
      {/* List title skeleton */}
      <Skeleton className="mb-6 h-8 w-48" />
      {/* Event list skeletons */}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}
