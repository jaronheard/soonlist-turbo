import { useEffect, useState } from "react";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

export function useDemoVideo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const videoUrl = useQuery(api.appConfig.getDemoVideoUrl);

  useEffect(() => {
    if (videoUrl) {
      setIsLoading(false);
    }
  }, [videoUrl]);

  const play = () => {
    setIsPlaying(true);
  };

  const pause = () => {
    setIsPlaying(false);
  };

  const replay = () => {
    setIsPlaying(true);
  };

  return {
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
