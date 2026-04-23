import { useCallback, useMemo } from "react";

import { useStableTimestamp } from "~/store";

type PaginationStatus =
  | "LoadingFirstPage"
  | "LoadingMore"
  | "CanLoadMore"
  | "Exhausted";

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

export function useLoadMoreHandler(
  status: PaginationStatus,
  loadMore: (numItems: number) => void,
  pageSize = 50,
) {
  return useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(pageSize);
    }
  }, [status, loadMore, pageSize]);
}
