import type { Metadata, ResolvingMetadata } from "next/types";
import { currentUser } from "@clerk/nextjs/server";

import type { EventMetadata } from "@soonlist/cal";
import type {
  AddToCalendarButtonProps,
  AddToCalendarButtonPropsRestricted,
} from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";
import { collapseSimilarEvents } from "@soonlist/cal";

import type { EventWithUser } from "~/components/EventList";
import { EventPage } from "~/components/EventDisplays";
import { env } from "~/env";
import { getPublicConvex } from "~/lib/convex-server";

interface Props {
  params: Promise<{
    eventId: string;
  }>;
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

export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const params = await props.params;
  const convex = await getPublicConvex();
  const event = await convex.query(api.events.get, { eventId: params.eventId });
  if (!event) {
    return {
      title: "No event found | Soonlist",
      openGraph: {
        images: [],
      },
    };
  }

  const eventData = event.event as AddToCalendarButtonProps;
  // optionally access and extend (rather than replace) parent metadata

  // For Open Graph, use the first available image with CDN parameters to ensure square crop
  let previewImage;
  if (eventData.images && eventData.images.length > 0 && eventData.images[0]) {
    // Apply CDN parameters to create a square crop anchored to the top
    const baseUrl = eventData.images[0].replace("/raw/", "/image/");
    const imageUrl = `${baseUrl}?w=640&h=640&fit=crop&crop=top&f=webp&q=80`;
    previewImage = [{ url: imageUrl }];
  }

  return {
    title: `${eventData.name} | Soonlist`,
    openGraph: {
      title: `${eventData.name}`,
      description: `(${eventData.startDate} ${eventData.startTime}-${eventData.endTime}) ${eventData.description}`,
      url: `${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/event/${event.id}`,
      type: "article",
      images: previewImage || (await parent).openGraph?.images || [],
    },
  };
}

export default async function Page(props: Props) {
  const params = await props.params;
  const convex = await getPublicConvex();
  const event = await convex.query(api.events.get, { eventId: params.eventId });
  const user = await currentUser();
  if (!event) {
    return <p className="text-lg text-gray-500">No event found.</p>;
  }
  const eventData = event.event as AddToCalendarButtonPropsRestricted;
  const eventMetadata = event.eventMetadata as EventMetadata;
  const fullImageUrl = eventData.images?.[3];

  const convexDuplicates = await convex.query(
    api.events.getPossibleDuplicates,
    {
      startDateTime: event.startDateTime,
    },
  );
  const possibleDuplicateEvents = convexDuplicates.map(transformConvexEvent);

  // find the event that matches the current event
  const similarEvents = collapseSimilarEvents(
    possibleDuplicateEvents,
    user?.id,
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
