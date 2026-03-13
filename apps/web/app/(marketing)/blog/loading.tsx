import { Skeleton } from "@soonlist/ui/skeleton";

export default function BlogLoading() {
  return (
    <div className="bg-white px-6 py-32 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Skeleton className="mb-2 h-12 w-48" />
        <Skeleton className="mb-12 h-6 w-96" />
        <div className="mb-8 flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md border p-6">
              <Skeleton className="mb-3 h-5 w-20 rounded-full" />
              <Skeleton className="mb-2 h-7 w-full" />
              <Skeleton className="mb-4 h-4 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
