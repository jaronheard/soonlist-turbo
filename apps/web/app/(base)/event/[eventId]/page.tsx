import type { Metadata } from "next";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import { getAuthenticatedConvex } from "~/lib/convex-server";
import { OG_IMAGE_SIZE, rewriteBytescaleToJpeg } from "~/lib/og-image";
import EventPageClient from "./EventPageClient";

// `/api/og` renders at exactly OG_IMAGE_SIZE, so dimensions are honest.
// Used when an event has no image, keeping the card summary_large_image.
const FALLBACK_OG_IMAGE = {
  url: "/api/og",
  ...OG_IMAGE_SIZE,
} as const;

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

    const eventData = event.event as AddToCalendarButtonPropsRestricted;
    const rawEventImage = eventData.images?.[0];

    // Omit og:image:width/height for user images: source dimensions are
    // unknown, and declaring fixed ones against a portrait poster causes
    // strict crawlers (notably Apple's LinkPresentation) to drop the card.
    const ogImage = rawEventImage
      ? {
          url: rewriteBytescaleToJpeg(rawEventImage),
          alt: eventData.name || "Event image",
        }
      : FALLBACK_OG_IMAGE;

    return {
      title: `${eventData.name} | Soonlist`,
      description:
        eventData.description || `Join ${eventData.name} on Soonlist`,
      openGraph: {
        title: eventData.name || "Event on Soonlist",
        description:
          eventData.description || `Join ${eventData.name} on Soonlist`,
        type: "website",
        images: [ogImage],
        locale: "en_US",
        siteName: "Soonlist",
      },
      twitter: {
        card: "summary_large_image",
        title: eventData.name || "Event on Soonlist",
        description:
          eventData.description || `Join ${eventData.name} on Soonlist`,
        images: [ogImage.url],
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
