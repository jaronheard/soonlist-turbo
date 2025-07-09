import type { PaginationStatus } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useState } from "react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { offlineStorage } from "~/services/offlineStorage";
import { useStableTimestamp } from "~/store";
import { useNetworkState } from "./useNetworkState";
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
  isAutoLoadingPages: boolean;
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
  const [isAutoLoadingPages, setIsAutoLoadingPages] = useState(false);

  // Use real network state
  const { isOffline } = useNetworkState();
  const [hasReconnected, setHasReconnected] = useState(false);

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

  const paginatedQuery = useStablePaginatedQuery(queryFunction, queryArgs, {
    initialNumItems: 50,
  });

  const { results, status, loadMore } = paginatedQuery;
  const isLoadingFirstPage = status === "LoadingFirstPage";
  const isLoadingMore = status === "LoadingMore";
  const isDone = status === "Exhausted";
  const canLoadMore = status === "CanLoadMore";

  // Track reconnection
  useEffect(() => {
    if (!isOffline && hasReconnected) {
      // Clear this flag after a moment to prevent repeated triggers
      const timer = setTimeout(() => setHasReconnected(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, hasReconnected]);

  // Detect when we go from offline to online
  useEffect(() => {
    const wasOffline = isOffline;

    return () => {
      if (wasOffline && !isOffline) {
        setHasReconnected(true);
      }
    };
  }, [isOffline]);

  // Automatically load all pages when online
  useEffect(() => {
    async function loadAllPages() {
      if (!isOffline && canLoadMore && feedId) {
        setIsAutoLoadingPages(true);
        // Load more pages automatically
        loadMore(25);
      } else if (isDone || isOffline) {
        setIsAutoLoadingPages(false);
      }
    }

    void loadAllPages();
  }, [canLoadMore, isOffline, loadMore, feedId, isDone]);

  // Save to cache when data updates
  useEffect(() => {
    async function saveCache() {
      if (!feedId || !results || results.length === 0) return;

      try {
        await offlineStorage.saveFeedCache(
          feedId,
          results,
          new Date(stableTimestamp).getTime(),
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
    isAutoLoadingPages,
    loadMore,
    status,
    isDone,
  };
}
