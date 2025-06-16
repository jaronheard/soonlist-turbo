import type { Metadata } from "next";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import { getAuthenticatedConvex } from "~/lib/convex-server";
import EventPageClient from "./EventPageClient";

interface Props {
  params: Promise<{
    eventId: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;

  try {
    // Get an authenticated Convex client for server-side fetching
    const convex = await getAuthenticatedConvex();

    // Fetch the event data on the server
    const event = await convex.query(api.events.get, { eventId });

    if (!event) {
      return {
        title: "Event Not Found | Soonlist",
        description: "The requested event could not be found.",
      };
    }

    const eventData = event.event as AddToCalendarButtonPropsRestricted;
    const eventImage = eventData.images?.[3];

    // Generate Open Graph metadata
    return {
      title: `${eventData.name} | Soonlist`,
      description:
        eventData.description || `Join ${eventData.name} on Soonlist`,
      openGraph: {
        title: eventData.name || "Event on Soonlist",
        description:
          eventData.description || `Join ${eventData.name} on Soonlist`,
        type: "website",
        images: eventImage
          ? [
              {
                url: eventImage,
                width: 1200,
                height: 630,
                alt: eventData.name || "Event image",
              },
            ]
          : [],
        locale: "en_US",
        siteName: "Soonlist",
      },
      twitter: {
        card: eventImage ? "summary_large_image" : "summary",
        title: eventData.name || "Event on Soonlist",
        description:
          eventData.description || `Join ${eventData.name} on Soonlist`,
        images: eventImage ? [eventImage] : undefined,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for event:", error);

    return {
      title: "Event | Soonlist",
      description: "Discover and share events on Soonlist",
    };
  }
}

export default async function Page({ params }: Props) {
  const { eventId } = await params;

  return <EventPageClient eventId={eventId} />;
}
