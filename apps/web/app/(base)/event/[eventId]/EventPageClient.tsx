"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import { EventMetadataSchemaLoose } from "@soonlist/cal";
import type { EventMetadataLoose } from "@soonlist/cal";
import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import type { User } from "@soonlist/db/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import { EventPage } from "~/components/EventDisplays";
import { api as trpcApi } from "~/trpc/react";

const transformConvexUser = (user: Doc<"users">): User => {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    userImage: user.userImage,
    bio: user.bio,
    publicEmail: user.publicEmail,
    publicPhone: user.publicPhone,
    publicInsta: user.publicInsta,
    publicMetadata: user.publicMetadata,
    publicWebsite: user.publicWebsite,
    emoji: user.emoji,
    onboardingData: user.onboardingData,
    onboardingCompletedAt: user.onboardingCompletedAt
      ? new Date(user.onboardingCompletedAt)
      : null,
    createdAt: new Date(user.created_at),
    updatedAt: user.updatedAt ? new Date(user.updatedAt) : null,
  };
};

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

const coerceUser = (value: unknown): User | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const {
    id,
    username,
    email,
    displayName,
    userImage,
    bio,
    publicEmail,
    publicPhone,
    publicInsta,
    publicMetadata,
    publicWebsite,
    emoji,
    onboardingData,
    onboardingCompletedAt,
    createdAt,
    updatedAt,
  } = value;

  if (
    typeof id !== "string" ||
    typeof username !== "string" ||
    typeof email !== "string" ||
    typeof displayName !== "string" ||
    typeof userImage !== "string"
  ) {
    return undefined;
  }

  const toDate = (input: unknown): Date | null => {
    if (input instanceof Date) return input;
    if (typeof input === "string") {
      const parsed = new Date(input);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const normalizedOnboardingData =
    typeof onboardingData === "object" && onboardingData !== null
      ? onboardingData
      : null;

  return {
    id,
    username,
    email,
    displayName,
    userImage,
    bio: typeof bio === "string" ? bio : null,
    publicEmail: typeof publicEmail === "string" ? publicEmail : null,
    publicPhone: typeof publicPhone === "string" ? publicPhone : null,
    publicInsta: typeof publicInsta === "string" ? publicInsta : null,
    publicMetadata: isRecord(publicMetadata) ? publicMetadata : null,
    publicWebsite: typeof publicWebsite === "string" ? publicWebsite : null,
    emoji: typeof emoji === "string" ? emoji : null,
    onboardingData: normalizedOnboardingData,
    onboardingCompletedAt: toDate(onboardingCompletedAt),
    createdAt: toDate(createdAt) ?? new Date(),
    updatedAt: toDate(updatedAt),
  };
};

export default function EventPageClient({ eventId }: { eventId: string }) {
  const event = useQuery(api.events.get, { eventId });

  // Fallback to tRPC if event not found in Convex
  const { data: trpcEvent, isLoading: trpcLoading } =
    trpcApi.event.get.useQuery(
      { eventId },
      {
        // Only enable the query if Convex returned null (not found)
        enabled: event === null,
      },
    );

  // Scroll to top when navigating to this page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [eventId]);

  // Loading state - useQuery returns undefined while loading
  if (event === undefined || (event === null && trpcLoading)) {
    return null;
  }

  // Try to use Convex event first, then fallback to tRPC event
  const eventData = event || trpcEvent;

  // Event not found in both Convex and PlanetScale
  if (!eventData) {
    return (
      <p className="text-lg text-gray-500">No event found for ID: {eventId}</p>
    );
  }

  // Handle data structure differences between Convex and tRPC
  const isConvexEvent = "_creationTime" in eventData;

  if (!isAddToCalendarEvent(eventData.event)) {
    console.error("Invalid event payload received for event", eventId);
    return (
      <p className="text-lg text-gray-500">Invalid event data for ID: {eventId}</p>
    );
  }

  const calendarData = eventData.event;

  const metadataParseResult = EventMetadataSchemaLoose.safeParse(
    eventData.metadata ?? eventData.eventMetadata,
  );
  const metadata: EventMetadataLoose | undefined = metadataParseResult.success
    ? metadataParseResult.data
    : undefined;

  const fullImageUrl = calendarData.images?.[3] || null;

  const user = isConvexEvent
    ? eventData.user
      ? transformConvexUser(eventData.user)
      : undefined
    : coerceUser(eventData.user);

  const createdAt = isConvexEvent
    ? new Date(eventData._creationTime)
    : new Date(eventData.createdAt);

  return (
    <>
      <EventPage
        user={user}
        eventFollows={isConvexEvent ? [] : (eventData.eventFollows ?? [])}
        comments={isConvexEvent ? [] : (eventData.comments ?? [])}
        key={eventData.id}
        id={eventData.id}
        event={calendarData}
        eventMetadata={metadata}
        createdAt={createdAt}
        visibility={eventData.visibility}
        similarEvents={undefined}
        image={fullImageUrl}
        singleEvent
        hideCurator
        lists={
          isConvexEvent
            ? []
            : (eventData.eventToLists?.map((etl) => etl.list) ?? [])
        }
      />
    </>
  );
}
