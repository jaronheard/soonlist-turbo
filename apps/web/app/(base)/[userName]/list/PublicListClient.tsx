"use client";

import type { FunctionReturnType } from "convex/server";
import { use, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Globe, Lock, Pencil, Share, Share2 } from "lucide-react";
import { toast } from "sonner";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import type { User } from "@soonlist/db/types";
import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@soonlist/ui/dialog";

import type { EventWithUser } from "~/components/EventList";
import { EventList } from "~/components/EventList";
import { FullPageLoadingSpinner } from "~/components/FullPageLoadingSpinner";
import { UserInfo } from "~/components/UserInfo";
import { useStableTimestamp } from "~/hooks/useStableQuery";

interface Props {
  params: Promise<{ userName: string }>;
}

function hasConvexUser<T extends { user: Doc<"users"> | null }>(
  item: T,
): item is T & { user: Doc<"users"> } {
  return item.user !== null;
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

// Transform Convex events to EventWithUser format (for public list events)
function transformConvexEventsAsPublic(
  events:
    | FunctionReturnType<typeof api.users.getPublicListEvents>["page"]
    | undefined,
): EventWithUser[] {
  if (!events) return [];

  return events.filter(hasConvexUser).map((event) => ({
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
    visibility: "public",
    createdAt: new Date(event._creationTime),
    user: transformConvexUser(event.user),
    eventFollows: [],
    comments: [],
    eventToLists: [],
  }));
}

// Transform Convex events to EventWithUser format (for feed events)
function transformConvexEvents(
  events: FunctionReturnType<typeof api.feeds.getMyFeed>["page"] | undefined,
): EventWithUser[] {
  if (!events) return [];

  return events.filter(hasConvexUser).map((event) => ({
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
    user: transformConvexUser(event.user),
    eventFollows: [],
    comments: [],
    eventToLists: [],
  }));
}

export default function PublicListClient({ params }: Props) {
  const { userName } = use(params);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newListName, setNewListName] = useState("");

  const currentUser = useQuery(api.users.getCurrentUser);
  const publicListData = useQuery(api.users.getPublicList, {
    username: userName,
  });
  const stableNow = useStableTimestamp();

  const isOwner = currentUser?.username === userName;
  const isPublicListEnabled = publicListData?.user.publicListEnabled;

  // Determine if we should use the user's feed (includes followed events) or just their created events
  const shouldUseFeed = isOwner && isPublicListEnabled;

  // Query for user's personal feed (includes followed events) when viewing own list
  const myFeedQuery = usePaginatedQuery(
    api.feeds.getMyFeed,
    shouldUseFeed ? { filter: "upcoming" as const } : "skip",
    { initialNumItems: 100 },
  );

  // Query for public list events (only created events) for all other cases
  const publicListEventsQuery = usePaginatedQuery(
    api.users.getPublicListEvents,
    !shouldUseFeed
      ? {
          username: userName,
          filter: "upcoming" as const,
        }
      : "skip",
    { initialNumItems: 100 },
  );

  const updatePublicListSettings = useMutation(
    api.users.updatePublicListSettings,
  );

  // Use the appropriate query results based on whether we're using feed or public list
  const isLoading =
    (shouldUseFeed ? myFeedQuery.status : publicListEventsQuery.status) ===
      "LoadingFirstPage" || publicListData === undefined;

  // Transform events - use different transformer for feed vs public list events
  const events = shouldUseFeed
    ? transformConvexEvents(myFeedQuery.results)
    : transformConvexEventsAsPublic(publicListEventsQuery.results);

  // Client-side safety filter: hide events that have ended
  // This prevents showing ended events if the cron job hasn't run recently
  const stableNowDate = new Date(stableNow);
  const filteredEvents = events.filter((event) => {
    return new Date(event.endDateTime) >= stableNowDate;
  });

  // Events are already filtered by the query, just separate current vs future
  const currentEvents = filteredEvents.filter((item) => {
    const startDate = new Date(item.startDateTime);
    const endDate = new Date(item.endDateTime);
    const isCurrent = startDate < stableNowDate && endDate > stableNowDate;
    return isCurrent;
  });
  const futureEvents = filteredEvents.filter(
    (item) => new Date(item.startDateTime) >= stableNowDate,
  );

  const handleTogglePublicList = async (enabled: boolean) => {
    if (!currentUser) return;

    await updatePublicListSettings({
      userId: currentUser.id,
      publicListEnabled: enabled,
      publicListName: enabled
        ? `${currentUser.displayName}'s events`
        : undefined,
    });
  };

  const handleShareClick = async () => {
    const url = `${window.location.origin}/${userName}/list`;
    const listName =
      publicListData?.user.publicListName ||
      `${publicListData?.user.displayName}'s events`;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- navigator.share may not exist in all browsers
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${listName} | Soonlist`,
          text: `Check out ${listName} on Soonlist`,
          url: url,
        });
        console.log("List shared successfully");
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      // Fallback for browsers that do not support the Share API
      void navigator.clipboard.writeText(url);
      toast("List URL copied to clipboard!");
    }
  };

  const handleRename = async () => {
    if (!currentUser || !newListName.trim()) return;

    try {
      await updatePublicListSettings({
        userId: currentUser.id,
        publicListName: newListName.trim(),
      });
      setIsRenaming(false);
      setNewListName("");
    } catch (error) {
      console.error("Failed to rename list:", error);
    }
  };

  // Show full page spinner until all data is loaded
  if (currentUser === undefined || publicListData === undefined) {
    return <FullPageLoadingSpinner />;
  }

  // If user is the owner and public list is not enabled, show setup
  if (isOwner && !isPublicListEnabled) {
    return (
      <div className="mx-auto max-w-2xl">
        <UserInfo userName={userName} />
        <div className="p-2"></div>

        <div className="rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <Share2 className="size-6 text-blue-500" />
            <h2 className="font-heading text-xl font-bold">
              Share Your Events
            </h2>
          </div>

          <p className="mb-6 text-neutral-2">
            Create a public list to share all your events with anyone. This will
            make
            <strong> all your events</strong> (including private ones) visible
            to anyone with the link.
          </p>

          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <Globe className="mt-0.5 size-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Privacy Notice
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    This will make ALL your events publicly visible, including
                    any private events. Anyone with the link will be able to see
                    them.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => handleTogglePublicList(true)}
              className="w-full"
            >
              Enable Public List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If user is not the owner and public list is not enabled, show not found
  if (!isOwner && !isPublicListEnabled) {
    return (
      <div className="mx-auto max-w-2xl">
        <UserInfo userName={userName} />
        <div className="p-2"></div>

        <div className="rounded-lg border bg-white p-6 text-center">
          <Lock className="mx-auto mb-4 size-12 text-gray-400" />
          <h2 className="mb-2 font-heading text-xl font-bold">
            Private Profile
          </h2>
          <p className="text-neutral-2">
            This user hasn't enabled public event sharing.
          </p>
        </div>
      </div>
    );
  }

  // Show public list (either as owner or visitor)
  return (
    <div className="mx-auto max-w-2xl">
      <UserInfo userName={userName} />
      <div className="p-2"></div>

      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold">
              {publicListData?.user.publicListName ||
                `${publicListData?.user.displayName}'s events`}
            </h1>
            {isOwner && (
              <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => {
                      setNewListName(
                        publicListData?.user.publicListName ||
                          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- currentUser can be null
                          `${currentUser?.displayName}'s events` ||
                          "",
                      );
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Rename List</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="Enter list name"
                      className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void handleRename();
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleRename}
                        disabled={!newListName.trim()}
                        className="flex-1"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setIsRenaming(false);
                          setNewListName("");
                        }}
                        variant="secondary"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <Button onClick={handleShareClick}>
                <Share className="mr-2 size-4" />
                Share
              </Button>
              <Button
                onClick={() => handleTogglePublicList(false)}
                variant="secondary"
              >
                Disable
              </Button>
            </div>
          )}
        </div>
      </div>

      <EventList
        currentEvents={currentEvents}
        pastEvents={[]}
        futureEvents={futureEvents}
        hideCurator={false}
        showOtherCurators={false}
        showPrivateEvents={isOwner}
        variant="future-minimal"
        isLoading={isLoading}
      />
    </div>
  );
}
