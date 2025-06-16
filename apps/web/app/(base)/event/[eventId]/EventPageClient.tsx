"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import type { EventMetadata } from "@soonlist/cal";
import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import type { User } from "@soonlist/db/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import { EventPage } from "~/components/EventDisplays";

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

export default function EventPageClient({ eventId }: { eventId: string }) {
  const event = useQuery(api.events.get, { eventId });

  // Scroll to top when navigating to this page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [eventId]);

  // Loading state - useQuery returns undefined while loading
  if (event === undefined) {
    return null;
  }

  // Event not found - useQuery returns null when the query completes but finds no data
  if (event === null) {
    return (
      <p className="text-lg text-gray-500">No event found for ID: {eventId}</p>
    );
  }

  const eventData = event.event as AddToCalendarButtonPropsRestricted;
  const eventMetadata = event.eventMetadata as EventMetadata;
  const fullImageUrl = eventData.images?.[3] || null;

  return (
    <>
      <EventPage
        user={transformConvexUser(event.user!)}
        eventFollows={[]}
        comments={[]}
        key={event.id}
        id={event.id}
        event={eventData}
        eventMetadata={eventMetadata}
        createdAt={new Date(event._creationTime)}
        visibility={event.visibility}
        similarEvents={undefined}
        image={fullImageUrl}
        singleEvent
        hideCurator
        lists={[]}
      />
    </>
  );
}
