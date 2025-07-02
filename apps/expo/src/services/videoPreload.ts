import { Video } from "expo-av";

let preloadedVideo: Video | null = null;
let cachedVideoUrl: string | null = null;

export async function preloadDemoVideo(videoUrl: string) {
  try {
    if (!preloadedVideo || cachedVideoUrl !== videoUrl) {
      // Clean up previous video if URL changed
      if (preloadedVideo && cachedVideoUrl !== videoUrl) {
        await preloadedVideo.unloadAsync();
        preloadedVideo = null;
      }

      preloadedVideo = new Video({});
      await preloadedVideo.loadAsync(
        { uri: videoUrl },
        { shouldPlay: false },
        false,
      );
      cachedVideoUrl = videoUrl;
    }
  } catch (error) {
    console.error("Failed to preload demo video:", error);
  }
}

export function getPreloadedVideo() {
  return preloadedVideo;
}

export function clearPreloadedVideo() {
  if (preloadedVideo) {
    void preloadedVideo.unloadAsync();
    preloadedVideo = null;
    cachedVideoUrl = null;
  }
}
