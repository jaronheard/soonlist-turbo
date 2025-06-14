import type { Metadata, ResolvingMetadata } from "next/types";
import { currentUser } from "@clerk/nextjs/server";
import { CalendarHeart } from "lucide-react";

import { api } from "@soonlist/backend/convex/_generated/api";

import type { EventWithUser } from "~/components/EventList";
import { EventList } from "~/components/EventList";
import { UserInfo } from "~/components/UserInfo";
import { env } from "~/env";
import { getPublicConvex } from "~/lib/convex-server";

interface Props {
  params: Promise<{ userName: string }>;
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
  user: any,
): EventWithUser {
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
    user: user || {
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
  const convex = await getPublicConvex();
  const convexEvents = await convex.query(api.events.getForUser, {
    userName: params.userName,
  });
  
  // Get user data for the events
  const userResponse = await convex.query(api.users.getByUsername, {
    userName: params.userName,
  });
  
  const events = convexEvents.map((event) => transformConvexEvent(event, userResponse));

  if (!events) {
    return {
      title: "No events found | Soonlist",
      openGraph: {
        images: [],
      },
    };
  }

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
  const convex = await getPublicConvex();
  const convexEvents = await convex.query(api.events.getUpcomingForUser, {
    userName: params.userName,
  });
  
  // Get user data for the events
  const userResponse = await convex.query(api.users.getByUsername, {
    userName: params.userName,
  });
  
  const events = convexEvents.map((event) => transformConvexEvent(event, userResponse));

  // const pastEvents = events.filter((item) => item.endDateTime < new Date());

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
          <UserInfo userName={params.userName} />
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
