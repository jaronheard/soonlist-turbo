"use client";

import type { FunctionReturnType } from "convex/server";
import { usePaginatedQuery } from "convex/react";
import { Globe2 } from "lucide-react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import type { User } from "@soonlist/db/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import type { EventWithUser } from "~/components/EventList";
import { EventList } from "~/components/EventList";
import { useStableTimestamp } from "~/hooks/useStableQuery";

const transformConvexUser = (user: Doc<"users">): User => {
  return {
    ...user,
    createdAt: new Date(user.created_at),
    updatedAt: user.updatedAt ? new Date(user.updatedAt) : null,
    onboardingCompletedAt: user.onboardingCompletedAt
      ? new Date(user.onboardingCompletedAt)
      : null,
  };
};

// Transform Convex events to EventWithUser format
function transformConvexEvents(
  events: FunctionReturnType<typeof api.events.getDiscoverPaginated>["page"],
): EventWithUser[] {
  return events
    .filter((event) => event.user !== null && event.user !== undefined)
    .map((event) => ({
      id: event.id,
      userId: event.userId,
      updatedAt: event.updatedAt ? new Date(event.updatedAt) : null,
      userName: event.userName,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      event: event.event,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      eventMetadata: event.eventMetadata,
      endDateTime: new Date(event.endDateTime),
      startDateTime: new Date(event.startDateTime),
      visibility: event.visibility,
      createdAt: new Date(event._creationTime),
      user: transformConvexUser(event.user!),
      eventFollows: [],
      comments: [],
      eventToLists: [],
    }));
}

export default function Page() {
  const stableNow = useStableTimestamp();
  const { results } = usePaginatedQuery(
    api.events.getDiscoverPaginated,
    {},
    { initialNumItems: 50 },
  );

  if (!results || results.length === 0) {
    return null;
  }

  const events = transformConvexEvents(results);

  const pastEvents = events.filter((item) => item.endDateTime < stableNow);

  const currentEvents = events.filter(
    (item) => item.startDateTime < stableNow && item.endDateTime > stableNow,
  );
  const futureEvents = events.filter((item) => item.startDateTime >= stableNow);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-heading text-2xl font-bold leading-[1.08333] tracking-tight text-neutral-1">
        <div className="flex gap-4">
          <Globe2 className="size-6" />
          Discover
        </div>
      </h1>
      <EventList
        currentEvents={currentEvents}
        futureEvents={futureEvents}
        pastEvents={pastEvents}
        variant="future-minimal"
      />
      <div className="p-6"></div>
    </div>
  );
}
