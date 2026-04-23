import { useEffect, useRef, useState } from "react";

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
