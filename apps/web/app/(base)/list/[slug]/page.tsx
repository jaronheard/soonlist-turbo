"use client";

import type { FunctionReturnType } from "convex/server";
import { use } from "react";
import { useMutation, useQuery } from "convex/react";
import { Globe2, Users } from "lucide-react";
import { toast } from "sonner";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import type { User } from "@soonlist/validators";
import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";

import type { EventWithUser } from "~/components/EventList";
import { EventList } from "~/components/EventList";
import { FullPageLoadingSpinner } from "~/components/FullPageLoadingSpinner";
import { useStableTimestamp } from "~/hooks/useStableQuery";

interface Props {
  params: Promise<{ slug: string }>;
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

function transformListEvents(
  events: FunctionReturnType<typeof api.feeds.getListEvents>["page"],
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      user: transformConvexUser(event.user!),
      eventFollows: [],
      comments: [],
      eventToLists: [],
    }));
}

export default function ListPage({ params }: Props) {
  const { slug } = use(params);
  const stableNow = useStableTimestamp();

  const list = useQuery(api.lists.getListBySlug, { slug });
  const currentUser = useQuery(api.users.getCurrentUser);
  const isFollowing = useQuery(
    api.lists.isFollowingList,
    list ? { listId: list.id } : "skip",
  );

  const followList = useMutation(api.lists.followList);
  const unfollowList = useMutation(api.lists.unfollowList);

  const listEvents = useQuery(
    api.feeds.getListEvents,
    list
      ? {
          slug,
          paginationOpts: { numItems: 100, cursor: null },
          filter: "upcoming" as const,
        }
      : "skip",
  );

  if (list === undefined || currentUser === undefined) {
    return <FullPageLoadingSpinner />;
  }

  if (list === null) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="text-2xl font-bold text-neutral-1">List not found</h1>
        <p className="mt-2 text-neutral-2">
          This list doesn't exist or has been removed.
        </p>
      </div>
    );
  }

  const events = listEvents ? transformListEvents(listEvents.page) : [];

  const stableNowDate = new Date(stableNow);
  const filteredEvents = events.filter(
    (event) => new Date(event.endDateTime) >= stableNowDate,
  );

  const currentEvents = filteredEvents.filter((item) => {
    const startDate = new Date(item.startDateTime);
    const endDate = new Date(item.endDateTime);
    return startDate < stableNowDate && endDate > stableNowDate;
  });
  const futureEvents = filteredEvents.filter(
    (item) => new Date(item.startDateTime) >= stableNowDate,
  );

  const handleFollow = async () => {
    if (!list) return;
    try {
      await followList({ listId: list.id });
      toast("Following list!");
    } catch {
      toast.error("Failed to follow list");
    }
  };

  const handleUnfollow = async () => {
    if (!list) return;
    try {
      await unfollowList({ listId: list.id });
      toast("Unfollowed list");
    } catch {
      toast.error("Failed to unfollow list");
    }
  };

  const isLoading = listEvents === undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-interactive-1">
            <div className="flex items-center gap-3">
              <Globe2 className="size-6 text-interactive-1" />
              {list.name}
            </div>
          </h1>
          {list.description && (
            <p className="mt-1 text-sm text-neutral-2">{list.description}</p>
          )}
          <div className="mt-2 flex items-center gap-4 text-sm text-neutral-2">
            <span className="flex items-center gap-1">
              <Users className="size-4" />
              {list.contributorCount} contributor
              {list.contributorCount !== 1 ? "s" : ""}
            </span>
            <span>
              {list.followerCount} follower
              {list.followerCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {currentUser && (
          <div>
            {isFollowing ? (
              <Button variant="secondary" onClick={handleUnfollow}>
                Following
              </Button>
            ) : (
              <Button onClick={handleFollow}>Follow</Button>
            )}
          </div>
        )}
      </div>

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
