"use client";

import type { FunctionReturnType } from "convex/server";
import { use } from "react";
import { useQuery } from "convex/react";
import { CalendarHeart } from "lucide-react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import type { User } from "@soonlist/db/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import type { EventWithUser } from "~/components/EventList";
import { EventList } from "~/components/EventList";
import { UserInfo } from "~/components/UserInfo";
import {
  useStablePaginatedQuery,
  useStableTimestamp,
} from "~/hooks/useStableQuery";

interface Props {
  params: Promise<{ userName: string }>;
}

const transformConvexUser = (user: Doc<"users">): User => {
  return {
    ...user,
    createdAt: new Date(user.created_at),
    updatedAt: user.updatedAt ? new Date(user.updatedAt) : null,
    onboardingCompletedAt: user.onboardingCompletedAt
      ? new Date(user.onboardingCompletedAt)
      : null,
  };
};

// Transform Convex events to EventWithUser format
function transformConvexEvents(
  events: FunctionReturnType<
    typeof api.events.getEventsForUserPaginated
  >["page"],
): EventWithUser[] {
  return events
    .filter((event) => event.user !== null && event.user !== undefined)
    .map((event) => ({
      id: event.id,
      userId: event.userId,
      updatedAt: event.updatedAt ? new Date(event.updatedAt) : null,
      userName: event.userName,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      event: event.event,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      eventMetadata: event.eventMetadata,
      endDateTime: new Date(event.endDateTime),
      startDateTime: new Date(event.startDateTime),
      visibility: event.visibility,
      createdAt: new Date(event._creationTime),
      user: transformConvexUser(event.user!),
      eventFollows: [],
      comments: [],
      eventToLists: [],
    }));
}

export default function Page({ params }: Props) {
  const { userName } = use(params);
  const currentUser = useQuery(api.users.getCurrentUser);
  const self = currentUser?.username === userName;
  const stableNow = useStableTimestamp();

  const { results: convexEvents, status } = useStablePaginatedQuery(
    api.events.getEventsForUserPaginated,
    {
      userName,
      filter: "upcoming",
    },
    {
      initialNumItems: 100,
    },
  );

  const isLoading = status === "LoadingFirstPage";
  const events = convexEvents ? transformConvexEvents(convexEvents) : [];

  const currentEvents = events.filter((item) => {
    const isCurrent =
      new Date(item.startDateTime) < stableNow &&
      new Date(item.endDateTime) > stableNow;
    return isCurrent;
  });
  const futureEvents = events.filter(
    (item) => new Date(item.startDateTime) >= stableNow,
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
        isLoading={isLoading}
      />
    </div>
  );
}
