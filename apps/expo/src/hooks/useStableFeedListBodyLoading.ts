import { useCallback, useEffect, useRef, useState } from "react";

/** Convex paginated query status (live, not stabilized results). */
export type StablePaginatedStatus =
  | "LoadingFirstPage"
  | "CanLoadMore"
  | "Exhausted"
  | "LoadingMore";

function isFirstPageReady(status: StablePaginatedStatus): boolean {
  return (
    status === "CanLoadMore" ||
    status === "Exhausted" ||
    status === "LoadingMore"
  );
}

/**
 * Shared list-body loading flag for My Soonlist / My Scene: spinner below the
 * header in {@link UserEventsList}, without replacing the whole screen.
 *
 * - Initial load: `LoadingFirstPage` before any page is ready.
 * - Segment switch: user-driven refetch while `LoadingFirstPage` — including
 *   if the user switches before the first page resolves (pending ref covers that).
 *
 * @param extraLoading — e.g. followed-lists query still undefined (My Scene).
 * @param enabled — false resets refs (e.g. no followings); still allow `extraLoading`.
 */
export function useStableFeedListBodyLoading(
  status: StablePaginatedStatus,
  options: {
    enabled?: boolean;
    extraLoading?: boolean;
  } = {},
) {
  const { enabled = true, extraLoading = false } = options;

  const [hasReceivedFirstPage, setHasReceivedFirstPage] = useState(
    () => enabled && isFirstPageReady(status),
  );
  const segmentSwitchPendingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      segmentSwitchPendingRef.current = false;
      setHasReceivedFirstPage(false);
      return;
    }
    if (status !== "LoadingFirstPage") {
      segmentSwitchPendingRef.current = false;
    }
    if (isFirstPageReady(status)) {
      setHasReceivedFirstPage(true);
    }
  }, [enabled, status]);

  const markSegmentSwitchPending = useCallback(() => {
    segmentSwitchPendingRef.current = true;
  }, []);

  const listBodyLoading =
    extraLoading ||
    (enabled &&
      status === "LoadingFirstPage" &&
      (!hasReceivedFirstPage || segmentSwitchPendingRef.current));

  return { listBodyLoading, markSegmentSwitchPending };
}
