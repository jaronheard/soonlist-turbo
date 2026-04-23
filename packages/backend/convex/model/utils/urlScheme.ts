
export function getUrlScheme() {
  const ENV = process.env.CONVEX_ENV || process.env.NODE_ENV || "production";
  const isDev = ENV === "development";

  console.log("Deep link scheme detection:", {
    CONVEX_ENV: process.env.CONVEX_ENV,
    NODE_ENV: process.env.NODE_ENV,
    ENV,
    isDev,
    scheme: isDev ? "soonlist.dev" : "soonlist",
  });

  if (isDev) {
    return "soonlist.dev";
  }
  return "soonlist";
}

export function createDeepLink(path: string) {
  const scheme = getUrlScheme();
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${scheme}://${cleanPath}`;
}
