import type { Metadata } from "next";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import { getAuthenticatedConvex } from "~/lib/convex-server";
import EventPageClient from "./EventPageClient";

// Branded card rendered by `app/api/og/route.tsx` at 1200×630. Used when an
// event has no image so the rich preview stays `summary_large_image`.
const FALLBACK_OG_IMAGE = {
  url: "/api/og",
  width: 1200,
  height: 630,
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
    const eventImage = eventData.images?.[0];

    // For user images: emit URL only, *no* og:image:width/height. The
    // previous code hardcoded 1200×630, but most event posters are
    // portrait (e.g. 640×853) — a dimension mismatch that Apple's
    // LinkPresentation and other strict crawlers can interpret as an
    // invalid card and silently drop, producing the intermittent
    // "sometimes the rich preview shows up, sometimes it doesn't"
    // pattern for events shared via iMessage. Letting crawlers infer
    // from the actual bytes removes the lie. For the branded fallback,
    // we render at exactly 1200×630 so we *can* declare honestly.
    const ogImage = eventImage
      ? { url: eventImage, alt: eventData.name || "Event image" }
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
