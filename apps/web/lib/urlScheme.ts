export function getUrlScheme(): string {
  return process.env.NODE_ENV === "production" ? "soonlist" : "soonlist.dev";
}

export function createDeepLink(path: string): string {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${getUrlScheme()}://${cleanPath}`;
}
