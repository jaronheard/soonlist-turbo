import type { Metadata, ResolvingMetadata } from "next/types";
import { currentUser } from "@clerk/nextjs/server";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";

import type { User } from "@soonlist/db/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import type { EventWithUser } from "~/components/EventList";
import { env } from "~/env";
import { UpcomingClient } from "./UpcomingClient";

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
function transformConvexEvent(
  event: {
    _id: string;
    _creationTime: number;
    userId: string;
    updatedAt?: string | null;
    userName: string;
    event: unknown;
    eventMetadata?: unknown;
    endDateTime: string;
    startDateTime: string;
    visibility: "public" | "private";
  },
  convexUser: any,
): EventWithUser {
  const user = transformConvexUser(convexUser);
  return {
    id: event._id,
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

export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const params = await props.params;
  const preloadedEvents = await preloadQuery(api.events.getForUser, {
    userName: params.userName,
  });
  const convexEvents = preloadedQueryResult(preloadedEvents);

  // Get user data for the events
  const preloadedUser = await preloadQuery(api.users.getByUsername, {
    userName: params.userName,
  });
  const userResponse = preloadedQueryResult(preloadedUser);

  const events = convexEvents.map((event) =>
    transformConvexEvent(event, userResponse),
  );

  // events is always an array, even if empty

  const futureEvents = events.filter(
    (item) => new Date(item.startDateTime) >= new Date(),
  );

  const futureEventsCount = futureEvents.length;

  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `@${params.userName} (${futureEventsCount} upcoming events) | Soonlist`,
    openGraph: {
      title: `@${params.userName} (${futureEventsCount} upcoming events)`,
      description: `See the events that @${params.userName} has saved on Soonlist`,
      url: `${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/${params.userName}/events`,
      type: "article",
      images: [...previousImages],
    },
  };
}

export default async function Page(props: Props) {
  const params = await props.params;
  const activeUser = await currentUser();
  const self = activeUser?.username === params.userName;

  // Preload the queries for the client component
  const preloadedEvents = await preloadQuery(
    api.events.getUpcomingForUser,
    { userName: params.userName }
  );

  const preloadedUser = await preloadQuery(
    api.users.getByUsername,
    { userName: params.userName }
  );

  return (
    <UpcomingClient
      userName={params.userName}
      self={self}
      preloadedEvents={preloadedEvents}
      preloadedUser={preloadedUser}
    />
  );
}
