import type { Metadata } from "next";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import { getAuthenticatedConvex } from "~/lib/convex-server";
import { api as trpcApiServer } from "~/trpc/server";
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

    // First, try to fetch from Convex
    let event = await convex.query(api.events.get, { eventId });

    // If not found in Convex, fallback to TRPC
    if (!event) {
      const trpcEvent = await trpcApiServer.event.get({ eventId });

      if (trpcEvent) {
        // Use the tRPC event as-is since we handle differences in the client
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
        event = trpcEvent as any;
      }
    }

    if (!event) {
      return {
        title: "Event Not Found | Soonlist",
        description: "The requested event could not be found.",
      };
    }

    const eventData = event.event as AddToCalendarButtonPropsRestricted;
    const eventImage = eventData.images?.[0];

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
