export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

const BYTESCALE_PATH_RE = /^\/12a1yek\/(raw|image)(\/.+)$/;

// Force JPEG: satori (`next/og`) can't decode WebP, and several crawlers
// (Slack, LinkedIn, Discord, older Twitter) render it inconsistently.
// Non-Bytescale URLs pass through untouched.
//
// Omit `size` to preserve source dimensions — declaring a fixed size
// against a portrait user upload caused intermittent rejection by Apple's
// LinkPresentation. Existing `/image/` query params (e.g. `crop-x/y/w/h`
// from the in-app cropper) are inherited.
export function rewriteBytescaleToJpeg(
  url: string,
  size?: { width: number; height: number },
): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const match =
    parsed.hostname === "upcdn.io"
      ? BYTESCALE_PATH_RE.exec(parsed.pathname)
      : null;
  if (!match) return url;
  const params =
    match[1] === "image"
      ? new URLSearchParams(parsed.searchParams)
      : new URLSearchParams();
  if (size) {
    params.set("w", String(size.width));
    params.set("h", String(size.height));
    params.set("fit", "crop");
  }
  if (!params.has("q")) params.set("q", "82");
  params.set("f", "jpg");
  return `https://upcdn.io/12a1yek/image${match[2]}?${params.toString()}`;
}

// satori only decodes TTF/OTF/WOFF, not WOFF2. The User-Agent spoof makes
// Google Fonts return plain .ttf URLs; the regex targets the `/* latin */`
// block so we always pick Latin glyphs across font families. One
// AbortController spans both fetches so a stalled Google Fonts response
// can't hang the whole OG route past FONT_FETCH_TIMEOUT_MS.
const FONT_FETCH_TIMEOUT_MS = 4000;

export async function loadGoogleFont(
  family: string,
  weight: number,
): Promise<ArrayBuffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FONT_FETCH_TIMEOUT_MS);
  try {
    const urlFamily = family.replace(/ /g, "+");
    const cssRes = await fetch(
      `https://fonts.googleapis.com/css?family=${urlFamily}:${weight}&display=swap`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.118 Safari/537.36",
        },
        signal: controller.signal,
      },
    );
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const latinBlockMatch = /\/\*\s*latin\s*\*\/[\s\S]*?url\(([^)]+)\)/.exec(
      css,
    );
    const fallbackMatch = /url\(([^)]+)\)/.exec(css);
    const fontUrl = latinBlockMatch?.[1] ?? fallbackMatch?.[1];
    if (!fontUrl) return null;
    const fontRes = await fetch(fontUrl, { signal: controller.signal });
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch (err) {
    console.warn("[og-image] font fetch failed", family, weight, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
