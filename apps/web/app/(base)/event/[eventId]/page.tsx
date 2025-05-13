import type { Metadata, ResolvingMetadata } from "next/types";
import { currentUser } from "@clerk/nextjs/server";

import type { EventMetadata } from "@soonlist/cal";
import type {
  AddToCalendarButtonProps,
  AddToCalendarButtonPropsRestricted,
} from "@soonlist/cal/types";
import { collapseSimilarEvents } from "@soonlist/cal";

import type { EventWithUser } from "~/components/EventList";
import { EventPage } from "~/components/EventDisplays";
import { env } from "~/env";
import { api } from "~/trpc/server";

interface Props {
  params: {
    eventId: string;
  };
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const event = await api.event.get({ eventId: params.eventId });
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
  // images are in the order of square, 4:3, 16:9, cropped
  const hasAllImages = eventData.images && eventData.images.length === 4;
  // Use the square image (index 0) for Open Graph to match the EventPage component display
  const previewImage = hasAllImages ? eventData.images?.slice(0, 1) : undefined;

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

export default async function Page({ params }: Props) {
  const event = await api.event.get({ eventId: params.eventId });
  const user = await currentUser();
  if (!event) {
    return <p className="text-lg text-gray-500">No event found.</p>;
  }
  const eventData = event.event as AddToCalendarButtonPropsRestricted;
  const eventMetadata = event.eventMetadata as EventMetadata;
  const fullImageUrl = eventData.images?.[3];

  const possibleDuplicateEvents = (await api.event.getPossibleDuplicates({
    startDateTime: event.startDateTime,
  })) as EventWithUser[];

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
        createdAt={event.createdAt}
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
