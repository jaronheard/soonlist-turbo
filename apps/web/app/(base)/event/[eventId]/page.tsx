import type { Metadata, ResolvingMetadata } from "next/types";
import { currentUser } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";

import type { EventMetadata } from "@soonlist/cal";
import type {
  AddToCalendarButtonProps,
  AddToCalendarButtonPropsRestricted,
} from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";
import { collapseSimilarEvents } from "@soonlist/cal";

import { EventPage } from "~/components/EventDisplays";
import { env } from "~/env";

interface Props {
  params: Promise<{
    eventId: string;
  }>;
}

export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const params = await props.params;
  const event = await fetchQuery(api.events.get, {
    eventId: params.eventId,
  });
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
  const event = await fetchQuery(api.events.get, {
    eventId: params.eventId,
  });
  const user = await currentUser();
  if (!event) {
    return <p className="text-lg text-gray-500">No event found.</p>;
  }
  const eventData = event.event as AddToCalendarButtonPropsRestricted;
  const eventMetadata = event.eventMetadata as EventMetadata;
  const fullImageUrl = eventData.images?.[3];

  const possibleDuplicateEvents = await fetchQuery(
    api.events.getPossibleDuplicates,
    {
      startDateTime: event.startDateTime,
    },
  );

  // find the event that matches the current event
  const similarEvents = collapseSimilarEvents(
    possibleDuplicateEvents,
    user?.id,
  ).find((similarEvent) => similarEvent.event.id === event.id)?.similarEvents;

  const lists = event.eventToLists.map((list) => list.list);

  return (
    <>
      <EventPage
        user={event.user}
        eventFollows={event.eventFollows}
        comments={event.comments}
        key={event.id}
        id={event.id}
        event={eventData}
        eventMetadata={eventMetadata}
        createdAt={new Date(event.created_at)}
        visibility={event.visibility}
        similarEvents={similarEvents}
        image={fullImageUrl}
        singleEvent
        hideCurator
        lists={lists}
      />
    </>
  );
}
