"use client";

import type { FunctionReturnType } from "convex/server";
import { use } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Globe2, List } from "lucide-react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import type { User } from "@soonlist/db/types";
import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";

import type { EventWithUser } from "~/components/EventList";
import { EventList } from "~/components/EventList";
import { FullPageLoadingSpinner } from "~/components/FullPageLoadingSpinner";
import { useStableTimestamp } from "~/hooks/useStableQuery";

interface Props {
  params: Promise<{ listId: string }>;
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
  events: FunctionReturnType<typeof api.feeds.getListFeed>["page"] | undefined,
): EventWithUser[] {
  if (!events) return [];

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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      user: transformConvexUser(event.user!),
      eventFollows: [],
      comments: [],
      eventToLists: [],
    }));
}

export default function ListDetailPage({ params }: Props) {
  const { listId } = use(params);
  const stableNow = useStableTimestamp();

  const list = useQuery(api.lists.getList, { listId });
  const isFollowing = useQuery(api.lists.isFollowingList, { listId });
  const followList = useMutation(api.lists.followList);
  const unfollowList = useMutation(api.lists.unfollowList);

  const { results, status } = usePaginatedQuery(
    api.feeds.getListFeed,
    list ? { listId, filter: "upcoming" as const } : "skip",
    { initialNumItems: 50 },
  );

  const isLoading = status === "LoadingFirstPage" || list === undefined;
  const events = transformConvexEvents(results);

  const stableNowDate = new Date(stableNow);
  const currentEvents: EventWithUser[] = [];
  const futureEvents: EventWithUser[] = [];

  for (const event of events) {
    if (event.endDateTime < stableNowDate) continue;
    if (
      event.startDateTime < stableNowDate &&
      event.endDateTime > stableNowDate
    ) {
      currentEvents.push(event);
    } else if (event.startDateTime >= stableNowDate) {
      futureEvents.push(event);
    }
  }

  const handleFollow = async () => {
    await followList({ listId });
  };

  const handleUnfollow = async () => {
    await unfollowList({ listId });
  };

  if (list === undefined) {
    return <FullPageLoadingSpinner />;
  }

  if (list === null) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="text-2xl font-bold text-neutral-1">List not found</h1>
        <p className="mt-2 text-neutral-2">
          This list doesn't exist or you don't have access to it.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-interactive-1">
          <div className="flex items-center gap-4">
            <Globe2 className="size-6 text-interactive-1" />
            {list.name}
          </div>
        </h1>
        <div className="flex items-center gap-2">
          {isFollowing !== undefined && (
            <Button
              onClick={isFollowing ? handleUnfollow : handleFollow}
              variant={isFollowing ? "secondary" : "default"}
              size="sm"
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </Button>
          )}
          <div
            className="flex items-center gap-2 rounded-lg bg-interactive-2 px-3 py-2 text-interactive-1"
            aria-label="List view (current)"
          >
            <List className="size-5" />
          </div>
        </div>
      </div>
      {list.description && (
        <p className="mb-4 text-neutral-2">{list.description}</p>
      )}
      <EventList
        currentEvents={currentEvents}
        futureEvents={futureEvents}
        pastEvents={[]}
        variant="future-minimal"
        isLoading={isLoading}
      />
      <div className="p-6"></div>
    </div>
  );
}
