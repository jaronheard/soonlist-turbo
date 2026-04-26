export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

const BYTESCALE_PATH_RE = /^\/12a1yek\/(raw|image)(\/.+)$/;

// Force JPEG output for OG image consumers. Several social crawlers (Slack,
// LinkedIn, Discord, older Twitter) and satori (`next/og`) don't reliably
// render WebP, which is what Bytescale serves by default. Returns the URL
// untouched if it isn't a Bytescale URL on our account.
//
// Existing query params on already-transformed `/image/` URLs are inherited
// so the user's source crop (`crop-x/y/w/h` set by the in-app cropper)
// survives. The output dimensions and codec are then overridden, since
// those are determined by where this URL is rendered, not by the editor.
export function rewriteBytescaleToJpeg(
  url: string,
  { width, height }: { width: number; height: number },
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
  params.set("w", String(width));
  params.set("h", String(height));
  params.set("fit", "crop");
  params.set("q", "82");
  params.set("f", "jpg");
  return `https://upcdn.io/12a1yek/image${match[2]}?${params.toString()}`;
}

// @vercel/og (satori) only understands TTF/OTF/WOFF — *not* WOFF2. Spoofing
// an older User-Agent makes Google Fonts return plain .ttf URLs in the CSS.
// The CSS contains multiple @font-face blocks (devanagari, latin-ext, latin,
// …); we target the `/* latin */` marker so we always fetch Latin glyphs.
//
// One AbortController spans both fetches so the whole font load is capped
// at FONT_FETCH_TIMEOUT_MS. Without a timeout, a stalled Google Fonts
// response blocks the OG route until Next's request timeout and returns
// an error to the crawler instead of an image — that was the dominant
// source of inconsistent rich previews for lists.
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
