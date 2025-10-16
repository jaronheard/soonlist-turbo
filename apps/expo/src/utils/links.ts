export function normalizeUrlForStorage(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed; // preserve entered protocol
  if (trimmed.startsWith("//")) return `https:${trimmed}`; // protocol-relative
  return `https://${trimmed}`; // default to https
}

export function formatUrlForDisplay(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, "");
    const path = `${u.pathname}${u.search}${u.hash}`;
    return `${host}${path}`;
  } catch {
    const withoutProtocol = url
      .replace(/^https?:\/\//i, "")
      .replace(/^\/\//, "");
    const withoutWww = withoutProtocol.replace(/^www\./i, "");
    return withoutWww;
  }
}
