import { useEffect, useState } from "react";
import type { PaginationStatus } from "convex/react";
import type { FunctionReturnType } from "convex/server";

import { api } from "@soonlist/backend/convex/_generated/api";

import { offlineStorage } from "~/services/offlineStorage";
import { useStableTimestamp } from "~/store";
import { useStablePaginatedQuery } from "./useStableQuery";

type FeedType = "user" | "discover" | "past";
type EventWithUser = NonNullable<
  FunctionReturnType<typeof api.feeds.getFeed>["page"][0]
>;

interface UseCachedFeedOptions {
  feedType: FeedType;
  userId?: string;
  filter: "upcoming" | "past";
}

interface UseCachedFeedResult {
  items: EventWithUser[] | undefined;
  isOffline: boolean;
  lastUpdated: number | undefined;
  isLoadingFirstPage: boolean;
  isLoadingMore: boolean;
  loadMore: (numItems: number) => void;
  status: PaginationStatus;
  isDone: boolean;
}

export function useCachedFeed({
  feedType,
  userId,
  filter,
}: UseCachedFeedOptions): UseCachedFeedResult {
  const [cachedData, setCachedData] = useState<{
    items: EventWithUser[];
    lastUpdated: number;
  } | null>(null);
  // TODO: Will be implemented with NetInfo in a future commit

  const [isOffline] = useState(false);

  const stableTimestamp = useStableTimestamp();

  // Determine feed ID
  const feedId = (() => {
    if (feedType === "user" && userId) {
      return `user_${userId}`;
    }
    if (feedType === "discover") {
      return "discover";
    }
    if (feedType === "past" && userId) {
      return `user_${userId}_past`;
    }
    return "";
  })();

  // Load cached data on mount
  useEffect(() => {
    async function loadCache() {
      if (!feedId) return;

      try {
        const cached = await offlineStorage.loadFeedCache(feedId);
        if (cached) {
          setCachedData({
            items: cached.items,
            lastUpdated: cached.lastUpdated,
          });
        }
      } catch (error) {
        console.error("Failed to load cached feed:", error);
      }
    }

    void loadCache();
  }, [feedId]);

  // Use the stable paginated query
  const queryFunction =
    feedType === "discover" ? api.feeds.getDiscoverFeed : api.feeds.getMyFeed;

  const queryArgs =
    feedType === "discover"
      ? { paginationOpts: { initialNumItems: 50, numItems: 25 } }
      : { filter, paginationOpts: { initialNumItems: 50, numItems: 25 } };

  const paginatedQuery = useStablePaginatedQuery(
    queryFunction,
    queryArgs,
    { initialNumItems: 50 }
  );

  const { results, status, loadMore } = paginatedQuery;
  const isLoadingFirstPage = status === "LoadingFirstPage";
  const isLoadingMore = status === "LoadingMore";
  const isDone = status === "Exhausted";

  // Save to cache when data updates
  useEffect(() => {
    async function saveCache() {
      if (!feedId || !results || results.length === 0) return;

      try {
        await offlineStorage.saveFeedCache(
          feedId,
          results,
          new Date(stableTimestamp).getTime()
        );

        // Update cached data state
        setCachedData({
          items: results,
          lastUpdated: Date.now(),
        });
      } catch (error) {
        console.error("Failed to save feed cache:", error);
      }
    }

    void saveCache();
  }, [feedId, results, stableTimestamp]);

  // Return appropriate data based on connection state
  const items =
    isOffline || (isLoadingFirstPage && cachedData !== null)
      ? cachedData?.items
      : results;

  return {
    items,
    isOffline,
    lastUpdated: cachedData?.lastUpdated,
    isLoadingFirstPage,
    isLoadingMore,
    loadMore,
    status,
    isDone,
  };
}
