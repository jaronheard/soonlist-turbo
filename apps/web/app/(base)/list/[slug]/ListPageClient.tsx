"use client";

import type { FunctionReturnType } from "convex/server";
import { useCallback } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { List as ListIcon, Share } from "lucide-react";
import { toast } from "sonner";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import type { User } from "@soonlist/validators";
import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";

import type { EventWithUser } from "~/components/EventList";
import { EventList } from "~/components/EventList";
import { FullPageLoadingSpinner } from "~/components/FullPageLoadingSpinner";
import { OpenInAppBanner } from "~/components/OpenInAppBanner";
import { UserAvatarMini } from "~/components/UserAvatarMini";
import { env } from "~/env";
import { useStableTimestamp } from "~/hooks/useStableQuery";
import { createDeepLink } from "~/lib/urlScheme";

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
  events: FunctionReturnType<typeof api.lists.getEventsForList>["page"],
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- filtered above
      user: transformConvexUser(event.user!),
      eventFollows: event.eventFollows ?? [],
      comments: [],
      eventToLists: [],
    }));
}

export default function ListPageClient({ slug }: { slug: string }) {
  const listResult = useQuery(api.lists.getBySlug, { slug });
  const { results, status, loadMore } = usePaginatedQuery(
    api.lists.getEventsForList,
    { slug },
    { initialNumItems: 50 },
  );
  const stableNow = useStableTimestamp();

  const shareUrl = `https://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/list/${slug}`;

  const list = listResult?.status === "ok" ? listResult.list : null;

  const handleShare = useCallback(async () => {
    const title = list?.name ? `${list.name} · Soonlist` : "Soonlist list";
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- navigator.share may not exist in all browsers
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch (error) {
        // User likely cancelled the share sheet; surfacing nothing is fine.
        console.error("Error sharing list", error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast("Link copied");
      } catch (error) {
        console.error("Error copying share URL", error);
        toast.error("Failed to copy link");
      }
    }
  }, [list?.name, shareUrl]);

  if (listResult === undefined) {
    return <FullPageLoadingSpinner />;
  }

  // Server already routed notFound/private — but guard in case of client re-fetch drift.
  if (listResult.status !== "ok") {
    return null;
  }

  const resolvedList = listResult.list;
  const events = transformListEvents(results);
  const stableNowDate = new Date(stableNow);

  const currentEvents = events.filter((item) => {
    const start = new Date(item.startDateTime);
    const end = new Date(item.endDateTime);
    return start < stableNowDate && end > stableNowDate;
  });
  const futureEvents = events.filter(
    (item) => new Date(item.startDateTime) >= stableNowDate,
  );
  const pastEvents = events.filter(
    (item) => new Date(item.endDateTime) < stableNowDate,
  );

  const owner = resolvedList.owner;

  return (
    <div className="mx-auto max-w-2xl">
      <OpenInAppBanner deepLink={createDeepLink(`list/${slug}`)} />

      <div className="mb-4 flex items-start gap-3 px-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-interactive-2">
          <ListIcon className="size-6 text-interactive-1" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-neutral-1">
            {resolvedList.name}
          </h1>
          {owner ? (
            <div className="mt-1">
              <UserAvatarMini
                username={owner.username}
                displayName={owner.displayName}
                userImage={owner.userImage}
              />
            </div>
          ) : null}
        </div>
        <Button
          onClick={handleShare}
          size="sm"
          variant="secondary"
          aria-label="Share list"
        >
          <Share className="mr-1.5 size-4" />
          Share
        </Button>
      </div>

      <EventList
        currentEvents={currentEvents}
        pastEvents={pastEvents}
        futureEvents={futureEvents}
        hideCurator={false}
        showOtherCurators
        variant="future-minimal"
        isLoading={status === "LoadingFirstPage"}
      />

      {status === "CanLoadMore" && (
        <div className="my-6 flex justify-center">
          <Button onClick={() => loadMore(25)} variant="secondary" size="sm">
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
