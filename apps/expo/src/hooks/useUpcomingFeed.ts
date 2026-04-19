import { useCallback, useMemo } from "react";

import { useStableTimestamp } from "~/store";

type PaginationStatus =
  | "LoadingFirstPage"
  | "LoadingMore"
  | "CanLoadMore"
  | "Exhausted";

/**
 * Drop events whose `endDateTime` is in the past relative to the app's stable
 * timestamp. Paired with the server-side `filter: "upcoming"` query, this is
 * a safety net that catches the window between an event ending and the
 * `updateHasEndedFlags` cron flipping its feed entry.
 *
 * Shared between the list detail view (`/list/[slug]`) and the public user
 * profile view (`/[username]`) so both feeds stay in lock-step.
 */
export function useUpcomingEventsFilter<T extends { endDateTime: string }>(
  events: T[],
): T[] {
  const stableTimestamp = useStableTimestamp();
  return useMemo(() => {
    const currentTime = new Date(stableTimestamp).getTime();
    return events.filter(
      (event) => new Date(event.endDateTime).getTime() >= currentTime,
    );
  }, [events, stableTimestamp]);
}

/**
 * Wraps `useStablePaginatedQuery`'s `loadMore` in the standard 25-item page
 * size + `CanLoadMore` guard used by every upcoming-events list screen.
 */
export function useLoadMoreHandler(
  status: PaginationStatus,
  loadMore: (numItems: number) => void,
  pageSize = 25,
) {
  return useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(pageSize);
    }
  }, [status, loadMore, pageSize]);
}
