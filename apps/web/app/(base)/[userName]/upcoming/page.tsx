"use client";

import type { FunctionReturnType } from "convex/server";
import { use } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { CalendarHeart } from "lucide-react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import type { User } from "@soonlist/validators";
import { api } from "@soonlist/backend/convex/_generated/api";

import type { EventWithUser } from "~/components/EventList";
import { EventList } from "~/components/EventList";
import { UserInfo } from "~/components/UserInfo";
import { useStableTimestamp } from "~/hooks/useStableQuery";

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

function transformConvexEvents(
  events:
    | FunctionReturnType<typeof api.feeds.getMyFeed>["page"]
    | FunctionReturnType<typeof api.feeds.getPublicUserFeed>["page"],
): EventWithUser[] {
  return events
    .filter((event) => event.user !== null)
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- user is guaranteed after filter
      user: transformConvexUser(event.user!),
      eventFollows: event.eventFollows,
      comments: [],
      eventToLists: [],
    }));
}

export default function Page({ params }: Props) {
  const { userName } = use(params);
  const currentUser = useQuery(api.users.getCurrentUser);
  const self = currentUser?.username === userName;
  const targetUser = useQuery(
    api.users.getByUsername,
    self ? "skip" : { userName },
  );
  const stableNow = useStableTimestamp();

  const myFeedQuery = usePaginatedQuery(
    api.feeds.getMyFeed,
    self ? { filter: "upcoming" as const } : "skip",
    { initialNumItems: 100 },
  );
  const publicFeedQuery = usePaginatedQuery(
    api.feeds.getPublicUserFeed,
    !self && targetUser
      ? { username: userName, filter: "upcoming" as const }
      : "skip",
    { initialNumItems: 100 },
  );

  const { results: convexEvents, status } = self
    ? myFeedQuery
    : publicFeedQuery;

  const isLoading =
    status === "LoadingFirstPage" || (!self && targetUser === undefined);
  const events = convexEvents ? transformConvexEvents(convexEvents) : [];

  const stableNowDate = new Date(stableNow);
  const filteredEvents = events.filter((event) => {
    return new Date(event.endDateTime) >= stableNowDate;
  });

  const currentEvents = filteredEvents.filter((item) => {
    const startDate = new Date(item.startDateTime);
    const endDate = new Date(item.endDateTime);
    const isCurrent = startDate < stableNowDate && endDate > stableNowDate;
    return isCurrent;
  });
  const futureEvents = filteredEvents.filter(
    (item) => new Date(item.startDateTime) >= stableNowDate,
  );

  return (
    <div className="mx-auto max-w-2xl">
      {self ? (
        <h1 className="mb-4 text-2xl font-bold text-interactive-1">
          <div className="flex items-center gap-4">
            <CalendarHeart className="size-6 text-interactive-1" />
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
