"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import type { EventMetadata } from "@soonlist/cal";
import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import type { User } from "@soonlist/validators";
import { api } from "@soonlist/backend/convex/_generated/api";
import { Skeleton } from "@soonlist/ui/skeleton";

import { EventPage } from "~/components/EventDisplays";
import { OpenInAppBanner } from "~/components/OpenInAppBanner";
import { createDeepLink } from "~/lib/urlScheme";

function normalizePublicMetadata(value: unknown): User["publicMetadata"] {
  return (value ?? null) as User["publicMetadata"];
}

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
    publicMetadata: normalizePublicMetadata(user.publicMetadata),
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [eventId]);

  const deepLink = createDeepLink(`event/${eventId}`);

  if (event === undefined) {
    return (
      <div className="flex flex-col gap-6">
        <OpenInAppBanner deepLink={deepLink} />
        <Skeleton className="aspect-[9/16] w-full max-w-md rounded-2xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

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
      <OpenInAppBanner deepLink={deepLink} />
      <EventPage
        user={user}
        eventFollows={event.eventFollows ?? []}
        comments={event.comments ?? []}
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
        lists={event.lists ?? []}
      />
    </>
  );
}
