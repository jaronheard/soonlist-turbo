"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";

import type { EventWithUser } from "~/components/EventList";
import { EventList } from "~/components/EventList";
import { useStableTimestamp } from "~/hooks/useStableQuery";

export default function ListDetailClient({ listId }: { listId: string }) {
  const list = useQuery(api.lists.getListById, { listId });
  const events = useQuery(api.lists.getListEvents, { listId });
  const isFollowing = useQuery(api.lists.isFollowingList, { listId });
  const followList = useMutation(api.lists.followList);
  const unfollowList = useMutation(api.lists.unfollowList);
  const stableNow = useStableTimestamp();

  const transformed = useMemo(() => {
    if (!events) return [] as EventWithUser[];
    return events.map((event) => ({
      ...event,
      startDateTime: new Date(event.startDateTime),
      endDateTime: new Date(event.endDateTime),
      createdAt: new Date(event._creationTime),
      user: event.user
        ? {
            ...event.user,
            createdAt: new Date(event.user.created_at),
            updatedAt: event.user.updatedAt
              ? new Date(event.user.updatedAt)
              : null,
            onboardingCompletedAt: event.user.onboardingCompletedAt
              ? new Date(event.user.onboardingCompletedAt)
              : null,
          }
        : null,
      eventFollows: [],
      comments: [],
      eventToLists: [],
    })) as EventWithUser[];
  }, [events]);

  const currentEvents: EventWithUser[] = [];
  const futureEvents: EventWithUser[] = [];

  for (const event of transformed) {
    if (event.endDateTime < stableNow) continue;
    if (event.startDateTime < stableNow && event.endDateTime > stableNow) {
      currentEvents.push(event);
    } else {
      futureEvents.push(event);
    }
  }

  if (list === undefined || events === undefined || isFollowing === undefined) {
    return <div className="p-4">Loading…</div>;
  }

  if (!list) {
    return <div className="p-4">List not found.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-interactive-1">{list.name}</h1>
          <p className="text-neutral-2">{list.description}</p>
        </div>
        <Button
          onClick={() =>
            isFollowing
              ? void unfollowList({ listId })
              : void followList({ listId })
          }
        >
          {isFollowing ? "Unfollow" : "Follow"}
        </Button>
      </div>

      <EventList
        currentEvents={currentEvents}
        futureEvents={futureEvents}
        pastEvents={[]}
        variant="future-minimal"
        isLoading={false}
      />
    </div>
  );
}
