/* eslint-disable @typescript-eslint/consistent-type-assertions */

import { useRef } from "react";
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
 * does not return empty results. Instead, it continues to return the
 * previously loaded results until the new results have finished loading.
 *
 * Note: the returned `status` reflects the live status (including
 * "LoadingMore") so callers can render load-more spinners while pagination
 * is in flight. Only the `results` array is stabilized. When query args change
 * (e.g. Upcoming/Past), results stay on the previous page until the new one
 * loads — pair with segment-aware UI filtering (see `~/utils/feedSegment.ts`).
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

  // Expose the live status so callers can detect LoadingMore, while keeping
  // the stabilized `results` array (and other fields) from the stored ref.
  return {
    ...stored.current,
    status: result.status,
    loadMore: result.loadMore,
  };
}) as typeof usePaginatedQuery;
