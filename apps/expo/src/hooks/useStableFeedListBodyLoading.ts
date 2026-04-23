import { useCallback, useEffect, useRef, useState } from "react";

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
