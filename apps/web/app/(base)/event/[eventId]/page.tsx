import type { Metadata } from "next";

import { api } from "@soonlist/backend/convex/_generated/api";
import { getEventDetails } from "@soonlist/cal";

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

    const eventImage = getEventDetails(event).images?.[0];
    const eventName = event.name;
    const eventDescription = event.description;

    // Generate Open Graph metadata with Smart App Banner for iOS
    return {
      title: `${eventName} | Soonlist`,
      description: eventDescription || `Join ${eventName} on Soonlist`,
      openGraph: {
        title: eventName || "Event on Soonlist",
        description: eventDescription || `Join ${eventName} on Soonlist`,
        type: "website",
        images: eventImage
          ? [
              {
                url: eventImage,
                width: 1200,
                height: 630,
                alt: eventName || "Event image",
              },
            ]
          : [],
        locale: "en_US",
        siteName: "Soonlist",
      },
      twitter: {
        card: eventImage ? "summary_large_image" : "summary",
        title: eventName || "Event on Soonlist",
        description: eventDescription || `Join ${eventName} on Soonlist`,
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
