import type { FunctionReturnType } from "convex/server";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { api } from "@soonlist/backend/convex/_generated/api";

const CACHE_PREFIX = "soonlist_feed_cache_";
const SCHEMA_VERSION = 1;

// Type for an event with user data, based on what the feed query returns
type EventWithUser = NonNullable<
  FunctionReturnType<typeof api.feeds.getFeed>["page"][0]
>;

export interface CachedFeedData {
  feedId: string;
  items: EventWithUser[];
  lastUpdated: number;
  lastSyncedTimestamp: number;
  totalItems: number;
  schemaVersion: number;
}

export interface CacheMetadata {
  feedId: string;
  size: number;
  lastUpdated: number;
}

class OfflineStorageService {
  private readonly maxCacheSize = 5 * 1024 * 1024; // 5MB limit per feed

  /**
   * Save feed data to cache
   */
  async saveFeedCache(
    feedId: string,
    items: EventWithUser[],
    stableTimestamp: number,
  ): Promise<void> {
    try {
      const cacheData: CachedFeedData = {
        feedId,
        items,
        lastUpdated: Date.now(),
        lastSyncedTimestamp: stableTimestamp,
        totalItems: items.length,
        schemaVersion: SCHEMA_VERSION,
      };

      const serialized = JSON.stringify(cacheData);

      // Check size limit
      if (serialized.length > this.maxCacheSize) {
        console.warn(
          `Feed cache for ${feedId} exceeds size limit, truncating...`,
        );
        // Take only the most recent items that fit
        const truncatedItems = this.truncateItemsToSize(
          items,
          this.maxCacheSize,
        );
        cacheData.items = truncatedItems;
        cacheData.totalItems = truncatedItems.length;
      }

      await AsyncStorage.setItem(
        `${CACHE_PREFIX}${feedId}`,
        JSON.stringify(cacheData),
      );
    } catch (error) {
      console.error(`Failed to save feed cache for ${feedId}:`, error);
      throw new Error(`Cache save failed: ${String(error)}`);
    }
  }

  /**
   * Load feed data from cache
   */
  async loadFeedCache(feedId: string): Promise<CachedFeedData | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${feedId}`);

      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached) as unknown as CachedFeedData;

      // Check schema version
      if (parsed.schemaVersion !== SCHEMA_VERSION) {
        console.log(`Cache schema mismatch for ${feedId}, clearing...`);
        await this.clearFeedCache(feedId);
        return null;
      }

      return parsed;
    } catch (error) {
      console.error(`Failed to load feed cache for ${feedId}:`, error);
      return null;
    }
  }

  /**
   * Clear specific feed cache
   */
  async clearFeedCache(feedId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${feedId}`);
    } catch (error) {
      console.error(`Failed to clear feed cache for ${feedId}:`, error);
    }
  }

  /**
   * Clear all feed caches
   */
  async clearAllCaches(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error("Failed to clear all caches:", error);
    }
  }

  /**
   * Get metadata for all cached feeds
   */
  async getCacheMetadata(): Promise<CacheMetadata[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

      const metadata: CacheMetadata[] = [];

      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const feedId = key.replace(CACHE_PREFIX, "");
          const parsed = JSON.parse(cached) as { lastUpdated?: number };
          metadata.push({
            feedId,
            size: cached.length,
            lastUpdated: parsed.lastUpdated ?? 0,
          });
        }
      }

      return metadata;
    } catch (error) {
      console.error("Failed to get cache metadata:", error);
      return [];
    }
  }

  /**
   * Get total cache size across all feeds
   */
  async getTotalCacheSize(): Promise<number> {
    const metadata = await this.getCacheMetadata();
    return metadata.reduce((total, item) => total + item.size, 0);
  }

  /**
   * Check if cache is fresh (within specified minutes)
   */
  isCacheFresh(cacheData: CachedFeedData, maxAgeMinutes = 60): boolean {
    const now = Date.now();
    const age = now - cacheData.lastUpdated;
    return age < maxAgeMinutes * 60 * 1000;
  }

  /**
   * Truncate items array to fit within size limit
   */
  private truncateItemsToSize(
    items: EventWithUser[],
    maxSize: number,
  ): EventWithUser[] {
    // Start with all items and progressively remove until it fits
    let truncated = [...items];
    let testData = { items: truncated };

    while (JSON.stringify(testData).length > maxSize && truncated.length > 0) {
      // Remove oldest items (assuming they're at the end)
      truncated = truncated.slice(0, Math.floor(truncated.length * 0.9));
      testData = { items: truncated };
    }

    return truncated;
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageService();
