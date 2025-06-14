"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { Globe2 } from "lucide-react";

import type { api } from "@soonlist/backend/convex/_generated/api";

import type { EventWithUser } from "~/components/EventList";
import { EventList } from "~/components/EventList";

interface Props {
  preloadedEvents: Preloaded<typeof api.events.getNext>;
}

// Transform Convex event to EventWithUser format
function transformConvexEvent(event: any): EventWithUser {
  return {
    id: event._id,
    userId: event.userId,
    updatedAt: event.updatedAt ? new Date(event.updatedAt) : null,
    userName: event.userName,
    event: event.event,
    eventMetadata: event.eventMetadata,
    endDateTime: new Date(event.endDateTime),
    startDateTime: new Date(event.startDateTime),
    visibility: event.visibility,
    createdAt: new Date(event._creationTime),
    user: event.user,
    eventFollows: event.eventFollows || [],
    comments: event.comments || [],
    eventToLists: event.eventToLists || [],
  };
}

export function ExploreClient({ preloadedEvents }: Props) {
  const convexEvents = usePreloadedQuery(preloadedEvents);
  const events = convexEvents.map(transformConvexEvent);

  const pastEvents = events.filter((item) => item.endDateTime < new Date());

  const currentEvents = events.filter(
    (item) => item.startDateTime < new Date() && item.endDateTime > new Date(),
  );
  const futureEvents = events.filter(
    (item) => item.startDateTime >= new Date(),
  );

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