"use client";

import type { FunctionReturnType } from "convex/server";
import { usePaginatedQuery } from "convex/react";
import { Globe2 } from "lucide-react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import type { User } from "@soonlist/db/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import type { EventWithUser } from "~/components/EventList";
import { EventList } from "~/components/EventList";
import { useStableTimestamp } from "~/hooks/useStableQuery";
import { usePasteImageHandler } from "~/hooks/usePasteImageHandler";
import { PasteImageIndicator } from "~/components/PasteImageIndicator";

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
  events: FunctionReturnType<typeof api.feeds.getDiscoverFeed>["page"],
): EventWithUser[] {
  return events.map((event) => ({
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

export default function Page() {
  const stableNow = useStableTimestamp();
  const { results, status } = usePaginatedQuery(
    api.feeds.getDiscoverFeed,
    {
      filter: "upcoming",
    },
    { initialNumItems: 50 },
  );

  // Enable image paste functionality for creating events
  const { isProcessing: isPasteProcessing } = usePasteImageHandler({
    enabled: true,
    showToasts: true,
  });

  const isLoading = status === "LoadingFirstPage";
  const events = results ? transformConvexEvents(results) : [];

  // Client-side safety filter: hide events that have ended
  // This prevents showing ended events if the cron job hasn't run recently
  // Also separate current vs future events in a single pass
  const currentEvents: typeof events = [];
  const futureEvents: typeof events = [];

  for (const event of events) {
    // Skip ended events
    if (event.endDateTime < stableNow) continue;

    // Categorize as current or future
    if (event.startDateTime < stableNow && event.endDateTime > stableNow) {
      currentEvents.push(event);
    } else if (event.startDateTime >= stableNow) {
      futureEvents.push(event);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold text-interactive-1">
        <div className="flex items-center gap-4">
          <Globe2 className="size-6 text-interactive-1" />
          Discover
        </div>
      </h1>
      <EventList
        currentEvents={currentEvents}
        futureEvents={futureEvents}
        pastEvents={[]}
        variant="future-minimal"
        isLoading={isLoading}
      />
      <div className="p-6"></div>
      
      {/* Show paste indicator for authenticated users */}
      <PasteImageIndicator enabled={!isPasteProcessing} />
    </div>
  );
}
