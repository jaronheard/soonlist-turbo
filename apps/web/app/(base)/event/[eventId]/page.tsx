import type { Metadata, ResolvingMetadata } from "next/types";
import { currentUser } from "@clerk/nextjs/server";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";

import type { AddToCalendarButtonProps } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import { env } from "~/env";
import { EventClient } from "./EventClient";

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
  const preloadedEvent = await preloadQuery(api.events.get, { eventId: params.eventId });
  const event = preloadedQueryResult(preloadedEvent);
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
  const user = await currentUser();

  const preloadedEvent = await preloadQuery(api.events.get, { eventId: params.eventId });
  const event = preloadedQueryResult(preloadedEvent);
  
  if (!event) {
    return <p className="text-lg text-gray-500">No event found.</p>;
  }

  const preloadedDuplicates = await preloadQuery(
    api.events.getPossibleDuplicates,
    { startDateTime: event.startDateTime }
  );

  return (
    <EventClient
      eventId={params.eventId}
      userId={user?.id}
      preloadedEvent={preloadedEvent}
      preloadedDuplicates={preloadedDuplicates}
    />
  );
}
