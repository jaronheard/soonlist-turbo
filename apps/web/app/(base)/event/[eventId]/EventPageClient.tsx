"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import type { EventMetadata } from "@soonlist/cal";
import type { User } from "@soonlist/cal/dbTypes";
import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";
import { Skeleton } from "@soonlist/ui/skeleton";

import { EventPage } from "~/components/EventDisplays";
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

  // Scroll to top when navigating to this page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [eventId]);

  // Loading state - useQuery returns undefined while loading
  if (event === undefined) {
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

  // Event not found
  if (!event) {
    return (
      <p className="text-lg text-gray-500">No event found for ID: {eventId}</p>
    );
  }

  const calendarData = event.event as AddToCalendarButtonPropsRestricted;
  const metadata = event.eventMetadata as EventMetadata;
  const fullImageUrl = calendarData.images?.[3] || null;
  const user = event.user ? transformConvexUser(event.user) : undefined;
  const createdAt = new Date(event._creationTime);

  return (
    <>
      <OpenInAppBanner eventId={eventId} />
      <EventPage
        user={user}
        eventFollows={[]}
        comments={[]}
        key={event.id}
        id={event.id}
        event={calendarData}
        eventMetadata={metadata}
        createdAt={createdAt}
        visibility={event.visibility}
        similarEvents={undefined}
        image={fullImageUrl}
        singleEvent
        hideCurator
        lists={[]}
      />
    </>
  );
}
