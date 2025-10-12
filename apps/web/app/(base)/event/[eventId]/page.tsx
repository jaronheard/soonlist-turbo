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

const isRecord = (input: unknown): input is Record<string, unknown> => {
  return typeof input === "object" && input !== null;
};

const isAddToCalendarEvent = (
  value: unknown,
): value is AddToCalendarButtonPropsRestricted => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.name === "string" &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string"
  );
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;

  try {
    // Get an authenticated Convex client for server-side fetching
    const convex = await getAuthenticatedConvex();

    // First, try to fetch from Convex
    const convexEvent = await convex.query(api.events.get, { eventId });
    const trpcEvent = convexEvent ? null : await trpcApiServer.event.get({ eventId });
    const event = convexEvent ?? trpcEvent;

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

    if (!isAddToCalendarEvent(event.event)) {
      return {
        title: "Invalid Event Data | Soonlist",
        description: "The event data is corrupted or incomplete.",
      };
    }

    const eventData = event.event;
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
const isAddToCalendarEvent = (
  value: unknown,
): value is AddToCalendarButtonPropsRestricted => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.name === "string" &&
    typeof candidate.startDate === "string" &&
    typeof candidate.endDate === "string"
  );
};
