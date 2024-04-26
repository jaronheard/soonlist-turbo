import Link from "next/link";
import { buttonVariants } from "./ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingEvent() {
  return (
    <div className="flex w-full">
      <div className="flex w-full flex-col space-y-2">
        <div className="flex items-start space-x-4">
          <Skeleton className="size-16 rounded bg-gray-300" />
          <div>
            <Skeleton className="h-8 w-48 rounded bg-gray-300" />
            <div className="p-2" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-20 rounded bg-gray-300" />
              <Skeleton className="h-4 w-24 rounded bg-gray-300" />
            </div>
          </div>
        </div>
        <Skeleton className="h-4 w-full rounded bg-gray-300" />
        <Skeleton className="h-4 w-72 rounded bg-gray-300" />
        <Skeleton className="h-4 w-20 rounded bg-gray-300" />
      </div>
    </div>
  );
}

export async function NextEventsLoading({ limit = 5 } = {}) {
  return (
    <div className="grid place-items-center">
      <div className="mr-auto flex place-items-center gap-2.5 px-6 font-medium">
        Events from early access users
      </div>
      <div className="grid w-full space-y-12 p-6">
        {Array<number>(limit).map((_, i) => (
          <LoadingEvent key={i} />
        ))}
      </div>
      <Link href="/events" className={buttonVariants({ variant: "link" })}>
        See all events
      </Link>
    </div>
  );
}
