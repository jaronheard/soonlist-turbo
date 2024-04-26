import { type Metadata, type ResolvingMetadata } from "next/types";
import { ResetNewEventContext } from "./ResetNewEventContext";
import { EventPage } from "@/components/EventDisplays";
import { UserInfo } from "@/components/UserInfo";
import {
  type AddToCalendarButtonPropsRestricted,
  type AddToCalendarButtonProps,
} from "@/types";
import { collapseSimilarEvents } from "@/lib/similarEvents";
import { type EventWithUser, EventList } from "@/components/EventList";
import { api } from "@/trpc/server";
import { type EventMetadata } from "@/lib/prompts";

type Props = {
  params: {
    eventId: string;
  };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const event = await api.event.get.query({ eventId: params.eventId });
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
  const previewImage = hasAllImages ? eventData.images?.slice(2, 3) : undefined;

  return {
    title: `${eventData.name} | Soonlist`,
    openGraph: {
      title: `${eventData.name}`,
      description: `(${eventData.startDate} ${eventData.startTime}-${eventData.endTime}) ${eventData.description}`,
      url: `${process.env.NEXT_PUBLIC_URL}/event/${event.id}`,
      type: "article",
      images: previewImage || (await parent).openGraph?.images || [],
    },
  };
}

export default async function Page({ params }: Props) {
  const event = await api.event.get.query({ eventId: params.eventId });
  if (!event) {
    return <p className="text-lg text-gray-500">No event found.</p>;
  }
  const otherEvents = await api.event.getCreatedForUser.query({
    userName: event.user.username,
  });

  const futureEvents = otherEvents
    .filter((item) => item.startDateTime >= new Date())
    .filter((item) => item.id !== event.id)
    .slice(0, 3);

  const eventData = event?.event as AddToCalendarButtonPropsRestricted;
  const eventMetadata = event?.eventMetadata as EventMetadata;
  const fullImageUrl = eventData.images?.[3];

  const possibleDuplicateEvents = (await api.event.getPossibleDuplicates.query({
    startDateTime: event.startDateTime,
  })) as EventWithUser[];

  // find the event that matches the current event
  const similarEvents = collapseSimilarEvents(possibleDuplicateEvents).find(
    (similarEvent) => similarEvent.event.id === event.id
  )?.similarEvents;

  const lists = event.eventToLists.map((list) => list.list);

  return (
    <>
      <ResetNewEventContext />
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
      <div className="w-full border-b border-neutral-3 pt-16 sm:pt-24"></div>
      <div className="w-full pt-16 sm:pt-24"></div>
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24">
        <UserInfo userId={event.userId} variant="description" />
        <EventList
          currentEvents={[]}
          pastEvents={[]}
          futureEvents={futureEvents}
          hideCurator
          variant="future-minimal"
          showOtherCurators={true}
        ></EventList>
      </div>
    </>
  );
}
