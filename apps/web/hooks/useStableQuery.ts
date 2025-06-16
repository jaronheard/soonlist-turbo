/* eslint-disable @typescript-eslint/consistent-type-assertions */

import { useEffect, useRef, useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";

/**
 * Drop-in replacement for useQuery intended to be used with a parametrized query.
 * Unlike useQuery, useStableQuery does not return undefined while loading new
 * data when the query arguments change, but instead will continue to return
 * the previously loaded data until the new data has finished loading.
 *
 * See https://stack.convex.dev/help-my-app-is-overreacting for details.
 *
 * @param name - string naming the query function
 * @param ...args - arguments to be passed to the query function
 * @returns UseQueryResult
 */
export const useStableQuery = ((name, ...args) => {
  const result = useQuery(name, ...args);
  const stored = useRef(result); // ref objects are stable between rerenders

  // result is only undefined while data is loading
  // if a freshly loaded result is available, use the ref to store it
  if (result !== undefined) {
    stored.current = result;
  }

  // undefined on first load, stale data while loading, fresh data after loading
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return stored.current;
}) as typeof useQuery;

/**
 * Drop-in replacement for usePaginatedQuery for use with a parametrized query.
 * Unlike usePaginatedQuery, when query arguments change useStablePaginatedQuery
 * does not return empty results and 'LoadingMore' status. Instead, it continues
 * to return the previously loaded results until the new results have finished
 * loading.
 *
 * See https://stack.convex.dev/help-my-app-is-overreacting for details.
 *
 * @param name - string naming the query function
 * @param ...args - arguments to be passed to the query function
 * @returns UsePaginatedQueryResult
 */
export const useStablePaginatedQuery = ((name, ...args) => {
  const result = usePaginatedQuery(name, ...args);
  const stored = useRef(result); // ref objects are stable between rerenders

  // If data is still loading, wait and do nothing
  // If data has finished loading, store the result
  if (result.status !== "LoadingMore" && result.status !== "LoadingFirstPage") {
    stored.current = result;
  }

  return stored.current;
}) as typeof usePaginatedQuery;

// Helper function to create a stable timestamp (rounded to 15-minute intervals)
function createStableTimestamp(): Date {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.floor(minutes / 15) * 15;
  const stableTime = new Date(now);
  stableTime.setMinutes(roundedMinutes, 0, 0); // Set seconds and milliseconds to 0
  return stableTime;
}

/**
 * Stable Timestamp Hook for Web App
 *
 * This hook provides a timestamp that updates every 15 minutes, designed for use
 * in paginated queries that filter by time (e.g., upcoming vs past events).
 *
 * Benefits:
 * - Prevents InvalidCursor errors during pagination by keeping the filter stable
 * - Maintains optimistic updates since Convex queries remain reactive
 * - Automatically updates every 15 minutes to keep data relatively fresh
 * - Can be manually refreshed when needed
 *
 * Usage:
 * ```tsx
 * const stableNow = useStableTimestamp();
 *
 * // Use for filtering events
 * const currentEvents = events.filter((item) => {
 *   const isCurrent = new Date(item.startDateTime) < stableNow && new Date(item.endDateTime) > stableNow;
 *   return isCurrent;
 * });
 * ```
 *
 * @returns A stable Date object that updates every 15 minutes
 */
export function useStableTimestamp(): Date {
  const [stableTimestamp, setStableTimestamp] = useState(() =>
    createStableTimestamp(),
  );
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    const checkForUpdate = () => {
      const now = Date.now();
      const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds

      if (now - lastUpdateRef.current > fifteenMinutes) {
        setStableTimestamp(createStableTimestamp());
        lastUpdateRef.current = now;
      }
    };

    // Check immediately
    checkForUpdate();

    // Set up interval to check every minute (to catch the 15-minute boundary)
    const interval = setInterval(checkForUpdate, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return stableTimestamp;
}

/**
 * Hook to manually refresh the stable timestamp
 * Useful when you want to force a refresh on certain user actions
 *
 * @returns A function to refresh the timestamp
 */
export function useRefreshStableTimestamp() {
  const [, setForceRefresh] = useState(0);

  return () => {
    setForceRefresh((prev) => prev + 1);
  };
}
