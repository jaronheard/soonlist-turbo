import type { Metadata } from "next";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import { getAuthenticatedConvex } from "~/lib/convex-server";
import { OG_IMAGE_SIZE, rewriteBytescaleToJpeg } from "~/lib/og-image";
import EventPageClient from "./EventPageClient";

// Branded fallback served by `app/api/og/route.tsx`. Used when an event has
// no image so crawlers always get *some* OG image instead of falling back
// to a `summary` (no-image) Twitter card or no preview at all.
const FALLBACK_OG_IMAGE = "/api/og";

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
    // Force JPEG so crawlers that mishandle Bytescale's default WebP still
    // render a preview; fall back to the branded default when the event
    // has no image so the Twitter card stays `summary_large_image`.
    const ogImageUrl = rawEventImage
      ? rewriteBytescaleToJpeg(rawEventImage, OG_IMAGE_SIZE)
      : FALLBACK_OG_IMAGE;

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
        images: [
          {
            url: ogImageUrl,
            width: OG_IMAGE_SIZE.width,
            height: OG_IMAGE_SIZE.height,
            alt: eventData.name || "Event image",
          },
        ],
        locale: "en_US",
        siteName: "Soonlist",
      },
      twitter: {
        card: "summary_large_image",
        title: eventData.name || "Event on Soonlist",
        description:
          eventData.description || `Join ${eventData.name} on Soonlist`,
        images: [ogImageUrl],
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
