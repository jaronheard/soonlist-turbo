"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { CalendarHeart } from "lucide-react";

import type { User } from "@soonlist/db/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import type { EventWithUser } from "~/components/EventList";
import { EventList } from "~/components/EventList";
import { UserInfo } from "~/components/UserInfo";

interface Props {
  params: Promise<{ userName: string }>;
}

// Helper to transform Convex user to DB User type
function transformConvexUser(convexUser: any): User | null {
  if (!convexUser) return null;

  return {
    id: convexUser.id,
    username: convexUser.username,
    email: convexUser.email,
    displayName: convexUser.displayName,
    userImage: convexUser.userImage,
    bio: convexUser.bio,
    publicEmail: convexUser.publicEmail,
    publicPhone: convexUser.publicPhone,
    publicInsta: convexUser.publicInsta,
    publicWebsite: convexUser.publicWebsite,
    publicMetadata: convexUser.publicMetadata,
    emoji: convexUser.emoji,
    onboardingData: convexUser.onboardingData,
    onboardingCompletedAt: convexUser.onboardingCompletedAt
      ? new Date(convexUser.onboardingCompletedAt)
      : null,
    createdAt: new Date(convexUser.created_at),
    updatedAt: convexUser.updatedAt ? new Date(convexUser.updatedAt) : null,
  };
}

// Transform Convex event to EventWithUser format
function transformConvexEvent(event: any, convexUser: any): EventWithUser {
  const user = transformConvexUser(convexUser);
  return {
    id: event.id,
    userId: event.userId,
    updatedAt: event.updatedAt ? new Date(event.updatedAt) : null,
    userName: event.userName,
    event: event.event,
    eventMetadata: event.eventMetadata,
    endDateTime: new Date(event.endDateTime),
    startDateTime: new Date(event.startDateTime),
    visibility: event.visibility,
    createdAt: new Date(event._creationTime),
    user: user ?? {
      id: event.userId,
      username: event.userName,
      displayName: event.userName,
      email: "",
      userImage: "",
      bio: null,
      publicEmail: null,
      publicPhone: null,
      publicInsta: null,
      publicWebsite: null,
      publicMetadata: null,
      emoji: null,
      onboardingData: null,
      onboardingCompletedAt: null,
      createdAt: new Date(),
      updatedAt: null,
    },
    eventFollows: [],
    comments: [],
    eventToLists: [],
  };
}

export default function Page({ params }: Props) {
  const { userName } = use(params);
  const currentUser = useQuery(api.users.getCurrentUser);
  const self = currentUser?.username === userName;

  const convexEvents = useQuery(api.events.getUpcomingForUser, {
    userName,
  });

  const userResponse = useQuery(api.users.getByUsername, {
    userName,
  });

  if (!convexEvents || !userResponse) {
    return null;
  }

  const events = convexEvents.map((event) => {
    console.log("Raw event from Convex:", event);
    const transformed = transformConvexEvent(event, userResponse);
    console.log("Transformed event ID:", transformed.id);
    return transformed;
  });

  const currentEvents = events.filter(
    (item) =>
      new Date(item.startDateTime) < new Date() &&
      new Date(item.endDateTime) > new Date(),
  );
  const futureEvents = events.filter(
    (item) => new Date(item.startDateTime) >= new Date(),
  );

  return (
    <div className="mx-auto max-w-2xl">
      {self ? (
        <h1 className="mb-4 font-heading text-2xl font-bold leading-[1.08333] tracking-tight text-neutral-1 ">
          <div className="flex gap-4">
            <CalendarHeart className="size-6" />
            My Feed
          </div>
        </h1>
      ) : (
        <>
          <UserInfo userName={userName} />
          <div className="p-2"></div>
        </>
      )}
      <EventList
        currentEvents={currentEvents}
        pastEvents={[]}
        futureEvents={futureEvents}
        hideCurator
        showOtherCurators={true}
        showPrivateEvents={self}
        variant="future-minimal"
      />
    </div>
  );
}
