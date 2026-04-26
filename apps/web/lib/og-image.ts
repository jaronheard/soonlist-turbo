export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

const BYTESCALE_ACCOUNT_ID = "12a1yek";
const BYTESCALE_HOST = "upcdn.io";
// Matches `/{accountId}/(raw|image)/{rest…}` — accepting both unprocessed
// `raw/` URLs and already-transformed `image/` URLs that may carry user crop
// params. Anything that doesn't match falls through unchanged.
const BYTESCALE_PATH_RE = new RegExp(
  `^/${BYTESCALE_ACCOUNT_ID}/(raw|image)(/.+)$`,
);

interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  fit?: "crop" | "max" | "shrink";
}

// Satori (used by `next/og`) and several social crawlers (Slack, LinkedIn,
// Discord, older Twitter) don't reliably render WebP. Bytescale serves WebP
// by default, so route renderable Bytescale URLs through `/image/` with
// `f=jpg`. Returns the original URL untouched if it isn't a Bytescale URL
// on our account — we don't want to rewrite arbitrary external URLs into
// bogus `/{accountId}/image/…` paths that would 404.
//
// When the source is already an `/image/` URL (e.g. an event image saved
// from our in-app cropper, with `crop-x` / `crop-y` query params) those
// params are preserved so the rich preview honors the user's crop. Any
// dimensions the caller passes override the existing values; `f=jpg` always
// wins. Pass no opts to keep the user's crop and dimensions and only force
// the JPEG codec.
export function rewriteBytescaleToJpeg(
  url: string,
  opts: TransformOptions = {},
): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== BYTESCALE_HOST) return url;
  const match = BYTESCALE_PATH_RE.exec(parsed.pathname);
  const mode = match?.[1];
  const filePath = match?.[2];
  if (!mode || !filePath) return url;
  const isAlreadyTransformed = mode === "image";

  const params = isAlreadyTransformed
    ? new URLSearchParams(parsed.searchParams)
    : new URLSearchParams();
  if (opts.width !== undefined) params.set("w", String(opts.width));
  if (opts.height !== undefined) params.set("h", String(opts.height));
  if (opts.fit !== undefined) params.set("fit", opts.fit);
  if (opts.quality !== undefined) params.set("q", String(opts.quality));
  if (!params.has("q")) params.set("q", "82");
  if (
    !params.has("fit") &&
    (opts.width !== undefined || opts.height !== undefined)
  ) {
    params.set("fit", "crop");
  }
  params.set("f", "jpg");

  return `https://${BYTESCALE_HOST}/${BYTESCALE_ACCOUNT_ID}/image${filePath}?${params.toString()}`;
}

// @vercel/og (satori) only understands TTF/OTF/WOFF — *not* WOFF2. Spoofing
// an older User-Agent makes Google Fonts return plain .ttf URLs in the CSS.
// The CSS contains multiple @font-face blocks (devanagari, latin-ext, latin,
// …); we target the `/* latin */` marker so we always fetch Latin glyphs.
//
// One AbortController is shared across both fetches so the *whole* font
// load is capped at FONT_FETCH_TIMEOUT_MS. Independent timeouts on each
// fetch would have a worst case of 2× the budget when the CSS just barely
// succeeds and the binary then stalls — pushing the route toward Next's
// request timeout when combined with a slow Convex query.
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
