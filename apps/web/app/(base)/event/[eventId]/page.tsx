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

    const event = await convex.query(api.events.get, { eventId });

    if (!event) {
      return {
        title: "Event Not Found | Soonlist",
        description: "The requested event could not be found.",
      };
    }

    if (!event.event) {
      return {
        title: "Invalid Event Data | Soonlist",
        description: "The event data is corrupted or incomplete.",
      };
    }

    const eventData = event.event as AddToCalendarButtonPropsRestricted;
    const eventImage = eventData.images?.[0];

    // Generate Open Graph metadata with Smart App Banner for iOS
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
      // iOS Smart App Banner - prompts users to open in the Soonlist app
      other: {
        "apple-itunes-app": `app-id=6670222216, app-argument=https://www.soonlist.com/event/${eventId}`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for event:", error);

    return {
      title: "Event | Soonlist",
      description:
        "An error occurred while loading event information. Please try again later.",
      robots: {
        index: false,
        follow: true,
      },
    };
  }
}

export default async function Page({ params }: Props) {
  const { eventId } = await params;

  return <EventPageClient eventId={eventId} />;
}
