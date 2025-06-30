/**
 * Utility to determine the appropriate URL scheme based on environment
 */

/**
 * Returns the URL scheme to use for deep links based on the current environment
 */
export function getUrlScheme() {
  // Use CONVEX_ENV for explicit environment detection, fallback to NODE_ENV
  const ENV = process.env.CONVEX_ENV || process.env.NODE_ENV || "production";
  const isDev = ENV === "development";

  // Log environment detection for debugging
  console.log("Deep link scheme detection:", {
    CONVEX_ENV: process.env.CONVEX_ENV,
    NODE_ENV: process.env.NODE_ENV,
    ENV,
    isDev,
    scheme: isDev ? "soonlist.dev" : "soonlist",
  });

  // Return appropriate scheme
  if (isDev) {
    return "soonlist.dev";
  }
  return "soonlist";
}

/**
 * Creates a deep link URL with the proper scheme based on environment
 * @param path The path for the deep link (without leading slash)
 * @returns Fully formed URL string with proper scheme
 */
export function createDeepLink(path: string) {
  const scheme = getUrlScheme();
  // Ensure path doesn't start with a slash
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${scheme}://${cleanPath}`;
}
