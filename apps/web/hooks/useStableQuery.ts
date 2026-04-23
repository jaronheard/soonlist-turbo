/* eslint-disable @typescript-eslint/consistent-type-assertions */

import { useEffect, useRef, useState } from "react";
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

  return stored.current;
}) as typeof usePaginatedQuery;

function createStableTimestamp(): Date {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.floor(minutes / 15) * 15;
  const stableTime = new Date(now);
  stableTime.setMinutes(roundedMinutes, 0, 0);
  return stableTime;
}

export function useStableTimestamp(): Date {
  const [stableTimestamp, setStableTimestamp] = useState(() =>
    createStableTimestamp(),
  );
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    const checkForUpdate = () => {
      const now = Date.now();
      const fifteenMinutes = 15 * 60 * 1000;

      if (now - lastUpdateRef.current > fifteenMinutes) {
        setStableTimestamp(createStableTimestamp());
        lastUpdateRef.current = now;
      }
    };

    checkForUpdate();

    const interval = setInterval(checkForUpdate, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return stableTimestamp;
}
