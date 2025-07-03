// Removing preloading functionality as it's causing errors
// The Video component from expo-av cannot be instantiated with new Video({})
// and is deprecated in favor of expo-video

export function preloadDemoVideo(_videoUrl: string) {
  // Just a placeholder now, actual preloading removed
  // The underscore prefix indicates the parameter is intentionally unused
}

export function getPreloadedVideo() {
  // Return null as we're not preloading anymore
  return null;
}

export function clearPreloadedVideo() {
  // No-op since we're not caching anything
}
