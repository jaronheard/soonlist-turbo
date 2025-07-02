import type { Video } from "expo-av";
import { useEffect, useState } from "react";
import { ResizeMode } from "expo-av";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { getPreloadedVideo, preloadDemoVideo } from "~/services/videoPreload";

export function useDemoVideo() {
  const [video, setVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const videoUrl = useQuery(api.appConfig.getDemoVideoUrl);

  useEffect(() => {
    if (videoUrl) {
      // Try to use preloaded video first
      const preloaded = getPreloadedVideo();
      if (preloaded) {
        setVideo(preloaded);
        setIsLoading(false);
      } else {
        // Preload if not already done
        preloadDemoVideo(videoUrl).then(() => {
          setVideo(getPreloadedVideo());
          setIsLoading(false);
        });
      }
    }
  }, [videoUrl]);

  const play = async () => {
    if (video) {
      await video.playAsync();
      setIsPlaying(true);
    }
  };

  const pause = async () => {
    if (video) {
      await video.pauseAsync();
      setIsPlaying(false);
    }
  };

  const replay = async () => {
    if (video) {
      await video.setPositionAsync(0);
      await video.playAsync();
      setIsPlaying(true);
    }
  };

  return {
    video,
    videoUrl,
    isPlaying,
    isLoading,
    play,
    pause,
    replay,
  };
}

// Preload function to call from app startup
export async function preloadDemoVideoOnStartup() {
  try {
    // This would need to be called with the actual Convex client
    // For now, just export the function for use in _layout.tsx
  } catch (error) {
    console.error("Failed to preload demo video on startup:", error);
  }
}
