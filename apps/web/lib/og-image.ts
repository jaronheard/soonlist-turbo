import * as Bytescale from "@bytescale/sdk";

import { extractFilePath } from "~/lib/utils";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

const BYTESCALE_ACCOUNT_ID = "12a1yek";
const BYTESCALE_HOST = "upcdn.io";

interface TransformOptions {
  width: number;
  height: number;
  quality?: number;
  fit?: "crop" | "max" | "shrink";
}

// Satori (used by `next/og`) and several social crawlers (Slack, LinkedIn,
// Discord, older Twitter) don't reliably render WebP. Bytescale serves WebP
// by default, so route renderable Bytescale URLs through `/image/` with
// `f=jpg` to force JPEG. Returns the original URL untouched if it isn't a
// Bytescale URL on our account, or if the path can't be parsed — we never
// want to rewrite arbitrary external URLs into bogus `/{accountId}/image/…`
// paths that would 404.
export function rewriteBytescaleToJpeg(
  url: string,
  opts: TransformOptions,
): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== BYTESCALE_HOST) return url;
  if (!parsed.pathname.startsWith(`/${BYTESCALE_ACCOUNT_ID}/`)) return url;
  const filePath = extractFilePath(url);
  if (!filePath) return url;
  return Bytescale.UrlBuilder.url({
    accountId: BYTESCALE_ACCOUNT_ID,
    filePath,
    options: {
      transformation: "image",
      transformationParams: {
        w: opts.width,
        h: opts.height,
        fit: opts.fit ?? "crop",
        f: "jpg",
        q: opts.quality ?? 82,
      },
    },
  });
}

// @vercel/og (satori) only understands TTF/OTF/WOFF — *not* WOFF2. Spoofing
// an older User-Agent makes Google Fonts return plain .ttf URLs in the CSS.
// The CSS contains multiple @font-face blocks (devanagari, latin-ext, latin,
// …); we target the `/* latin */` marker so we always fetch Latin glyphs.
//
// Both fetches have explicit timeouts: without them, a slow or stalled
// Google Fonts response can block the whole OG route until Next's request
// timeout, returning an error to the crawler instead of an image. That was
// the dominant source of inconsistent rich previews for lists.
const FONT_FETCH_TIMEOUT_MS = 4000;

export async function loadGoogleFont(
  family: string,
  weight: number,
): Promise<ArrayBuffer | null> {
  try {
    const urlFamily = family.replace(/ /g, "+");
    const cssRes = await fetch(
      `https://fonts.googleapis.com/css?family=${urlFamily}:${weight}&display=swap`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.118 Safari/537.36",
        },
        signal: AbortSignal.timeout(FONT_FETCH_TIMEOUT_MS),
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
    const fontRes = await fetch(fontUrl, {
      signal: AbortSignal.timeout(FONT_FETCH_TIMEOUT_MS),
    });
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch (err) {
    console.warn("[og-image] font fetch failed", family, weight, err);
    return null;
  }
}
