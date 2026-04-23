/* eslint-disable @typescript-eslint/consistent-type-assertions */

import { useRef } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";

export const useStableQuery = ((name, ...args) => {
  const result = useQuery(name, ...args);
  const stored = useRef(result);

  if (result !== undefined) {
    stored.current = result;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return stored.current;
}) as typeof useQuery;

export const useStablePaginatedQuery = ((name, ...args) => {
  const result = usePaginatedQuery(name, ...args);
  const stored = useRef(result);

  if (result.status !== "LoadingMore" && result.status !== "LoadingFirstPage") {
    stored.current = result;
  }

  return {
    ...stored.current,
    status: result.status,
    loadMore: result.loadMore,
  };
}) as typeof usePaginatedQuery;
