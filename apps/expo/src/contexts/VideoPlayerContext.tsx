import React, { createContext, useContext, useEffect, useState } from "react";
import { VideoPlayer } from "expo-video";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

interface VideoPlayerContextType {
  demoVideoPlayer: VideoPlayer | null;
  isVideoReady: boolean;
}

const VideoPlayerContext = createContext<VideoPlayerContextType>({
  demoVideoPlayer: null,
  isVideoReady: false,
});

export const useVideoPlayerContext = () => useContext(VideoPlayerContext);

export const VideoPlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [demoVideoPlayer, setDemoVideoPlayer] = useState<VideoPlayer | null>(
    null,
  );
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoUrl = useQuery(api.appConfig.getDemoVideoUrl);

  useEffect(() => {
    if (videoUrl) {
      // Create video player instance as soon as we have the URL
      const player = new VideoPlayer(videoUrl);

      // Configure the player
      player.loop = true;

      // Start preloading by replacing the source
      player.replace(videoUrl);

      setDemoVideoPlayer(player);
      setIsVideoReady(true);
    }
  }, [videoUrl]);

  return (
    <VideoPlayerContext.Provider value={{ demoVideoPlayer, isVideoReady }}>
      {children}
    </VideoPlayerContext.Provider>
  );
};
