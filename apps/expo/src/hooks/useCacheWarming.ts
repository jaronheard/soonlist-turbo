import { useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { offlineStorage } from "~/services/offlineStorage";
import { useStableTimestamp } from "~/store";

/**
 * Hook to warm the cache on app launch
 * This ensures users have recent data available for offline use
 */
export function useCacheWarming() {
  const { user } = useUser();
  const stableTimestamp = useStableTimestamp();

  // Fetch the first page of user's feed to warm the cache
  const userFeedData = useQuery(
    api.feeds.getMyFeed,
    user?.id
      ? {
          filter: "upcoming" as const,
          paginationOpts: { numItems: 50, cursor: null },
        }
      : "skip",
  );

  useEffect(() => {
    async function warmCache() {
      if (!user?.id || !userFeedData?.page) return;

      try {
        // Check if we already have fresh cache (less than 1 hour old)
        const existingCache = await offlineStorage.loadFeedCache(
          `user_${user.id}`,
        );
        if (existingCache && offlineStorage.isCacheFresh(existingCache, 60)) {
          console.log("Cache is fresh, skipping warming");
          return;
        }

        // Save the initial page to cache
        await offlineStorage.saveFeedCache(
          `user_${user.id}`,
          userFeedData.page,
          new Date(stableTimestamp).getTime(),
        );

        console.log("Cache warmed with", userFeedData.page.length, "events");
      } catch (error) {
        console.error("Failed to warm cache:", error);
      }
    }

    void warmCache();
  }, [user?.id, userFeedData?.page, stableTimestamp]);
}

/**
 * Hook to enable selective feed caching
 * Only caches the user's own feed, not discover or other feeds
 */
export function useSelectiveFeedCaching() {
  const { user } = useUser();

  useEffect(() => {
    // This could be extended to:
    // - Clear discover feed cache periodically
    // - Limit cache size for non-user feeds
    // - Implement different cache policies per feed type

    async function manageCaches() {
      if (!user?.id) return;

      try {
        const metadata = await offlineStorage.getCacheMetadata();

        // Keep only user's feed and clear others if they're too old
        for (const cache of metadata) {
          if (
            !cache.feedId.startsWith(`user_${user.id}`) &&
            !offlineStorage.isCacheFresh(
              { lastUpdated: cache.lastUpdated } as any,
              120,
            )
          ) {
            await offlineStorage.clearFeedCache(cache.feedId);
            console.log("Cleared old cache for", cache.feedId);
          }
        }
      } catch (error) {
        console.error("Failed to manage caches:", error);
      }
    }

    void manageCaches();
  }, [user?.id]);
}
