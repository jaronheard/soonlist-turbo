import { useCallback, useEffect, useState } from "react";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { videoCache } from "~/services/videoCache";

interface UseDemoVideoResult {
  videoUri: string | null;
  isLoading: boolean;
  error: Error | null;
  downloadProgress: number;
  retry: () => void;
  isDownloading: boolean;
}

export function useDemoVideo(): UseDemoVideoResult {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Fetch active demo video from Convex
  const activeDemoVideo = useQuery(api.demoVideos.getActiveDemoVideo);

  const loadVideo = useCallback(async () => {
    if (!activeDemoVideo) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if video is already cached
      const cachedUri = await videoCache.getCachedVideo(
        activeDemoVideo.version,
      );

      if (cachedUri) {
        setVideoUri(cachedUri);
        setIsLoading(false);
        return;
      }

      // Download the video
      setIsDownloading(true);
      const uri = await videoCache.downloadVideo(
        activeDemoVideo.url,
        activeDemoVideo.version,
        (progress) => {
          setDownloadProgress(progress);
        },
      );

      setVideoUri(uri);
    } catch (err) {
      console.error("Error loading demo video:", err);
      setError(err instanceof Error ? err : new Error("Failed to load video"));

      // If download fails, try to use the remote URL directly as a fallback
      if (activeDemoVideo.url) {
        setVideoUri(activeDemoVideo.url);
        // Clear error since we have a fallback video available
        setError(null);
      }
    } finally {
      setIsLoading(false);
      setIsDownloading(false);
    }
  }, [activeDemoVideo]);

  useEffect(() => {
    void loadVideo();
  }, [loadVideo]);

  const retry = useCallback(() => {
    setError(null);
    void loadVideo();
  }, [loadVideo]);

  return {
    videoUri,
    isLoading,
    error,
    downloadProgress,
    retry,
    isDownloading,
  };
}

// Preload helper for early app initialization
export async function preloadDemoVideo() {
  try {
    // Ensure cache directory exists
    await videoCache.ensureCacheDirectory();

    // Check if we should preload based on network conditions
    const shouldPreload = videoCache.shouldPreload();
    if (!shouldPreload) {
      console.log("Skipping video preload due to network conditions");
      return;
    }

    // Note: Since this runs outside React context, we can't use the useQuery hook.
    // In production, you would either:
    // 1. Create an HTTP endpoint in Convex to fetch video info
    // 2. Use the Convex client directly with proper initialization
    // 3. Delay preloading until within React context

    // For now, we'll just prepare the cache infrastructure
    console.log("Demo video cache prepared for preloading");

    // The actual video will be fetched when the user reaches the demo screen
    // or when the useDemoVideo hook is first called within React context
  } catch (error) {
    console.error("Error preparing demo video cache:", error);
  }
}
