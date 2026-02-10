"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import type { EventMetadata } from "@soonlist/cal";
import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import type { User } from "@soonlist/db/types";
import { api } from "@soonlist/backend/convex/_generated/api";
import { Skeleton } from "@soonlist/ui/skeleton";

import { EventPage } from "~/components/EventDisplays";
import { api as trpcApi } from "~/trpc/react";
import { OpenInAppBanner } from "./OpenInAppBanner";

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
    return (
      <div className="flex flex-col gap-6">
        <OpenInAppBanner eventId={eventId} />
        {/* Event image skeleton */}
        <Skeleton className="aspect-[9/16] w-full max-w-md rounded-2xl" />
        {/* Event details skeleton */}
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
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

  const calendarData = eventData.event as AddToCalendarButtonPropsRestricted;

  const metadata = eventData.eventMetadata as EventMetadata;

  const fullImageUrl = calendarData.images?.[3] || null;

  const user =
    isConvexEvent && eventData.user
      ? transformConvexUser(eventData.user)
      : (eventData.user as User) || undefined;

  const createdAt = isConvexEvent
    ? new Date(eventData._creationTime)
    : new Date(eventData.createdAt);

  return (
    <>
      <OpenInAppBanner eventId={eventId} />
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
