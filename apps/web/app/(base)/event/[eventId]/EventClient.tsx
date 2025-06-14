"use client";

import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";

import type { EventMetadata } from "@soonlist/cal";
import type {
  AddToCalendarButtonPropsRestricted,
} from "@soonlist/cal/types";
import type { api } from "@soonlist/backend/convex/_generated/api";
import { collapseSimilarEvents } from "@soonlist/cal";

import type { EventWithUser } from "~/components/EventList";
import { EventPage } from "~/components/EventDisplays";

interface Props {
  eventId: string;
  userId?: string;
  preloadedEvent: Preloaded<typeof api.events.get>;
  preloadedDuplicates: Preloaded<typeof api.events.getPossibleDuplicates>;
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

export function EventClient({ eventId, userId, preloadedEvent, preloadedDuplicates }: Props) {
  const event = usePreloadedQuery(preloadedEvent);
  const convexDuplicates = usePreloadedQuery(preloadedDuplicates);

  if (!event) {
    return <p className="text-lg text-gray-500">No event found.</p>;
  }

  const eventData = event.event as AddToCalendarButtonPropsRestricted;
  const eventMetadata = event.eventMetadata as EventMetadata;
  const fullImageUrl = eventData.images?.[3];

  const possibleDuplicateEvents = convexDuplicates.map(transformConvexEvent);

  // find the event that matches the current event
  const similarEvents = collapseSimilarEvents(
    possibleDuplicateEvents,
    userId,
  ).find((similarEvent) => similarEvent.event.id === event._id)?.similarEvents;

  // TODO: Implement event lists when list functionality is added to Convex
  const lists = [];

  return (
    <>
      <EventPage
        user={
          event.user
            ? {
                ...event.user,
                createdAt: new Date(
                  event.user.created_at || event.user._creationTime,
                ),
                updatedAt: event.user.updatedAt
                  ? new Date(event.user.updatedAt)
                  : null,
                onboardingCompletedAt: event.user.onboardingCompletedAt
                  ? new Date(event.user.onboardingCompletedAt)
                  : null,
              }
            : undefined
        }
        eventFollows={event.eventFollows || []}
        comments={(event.comments || []).map((comment: any) => ({
          ...comment,
          createdAt: new Date(comment.created_at || comment._creationTime),
          updatedAt: comment.updatedAt ? new Date(comment.updatedAt) : null,
        }))}
        key={event._id}
        id={event._id}
        event={eventData}
        eventMetadata={eventMetadata}
        createdAt={new Date(event._creationTime)}
        visibility={event.visibility}
        similarEvents={similarEvents}
        image={fullImageUrl}
        singleEvent
        hideCurator
        lists={[]}
      />
    </>
  );
}