/* eslint-disable @next/next/no-img-element -- next/image is not supported
inside @vercel/og ImageResponse trees; raw <img> is required. */
import { ImageResponse } from "next/og";
import * as Bytescale from "@bytescale/sdk";

import { api } from "@soonlist/backend/convex/_generated/api";

import { renderBrandedDefault } from "~/app/api/og/branded-default";
import {
  SOONLIST_MARK_CARD_PATH,
  SOONLIST_MARK_GLYPH_PATH,
  SOONLIST_MARK_VIEWBOX,
} from "~/lib/brand-logo";
import { getUnauthenticatedConvex } from "~/lib/convex-server";
import { extractFilePath } from "~/lib/utils";

export const runtime = "nodejs";
// Link-preview unfurls don't need sub-hour freshness; longer TTL amortizes the
// Convex query + font fetches + image rasterization across crawler bursts.
export const revalidate = 3600;

export const alt = "Shared list on Soonlist";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand tokens (apps/web/styles/globals.css CSS vars) rendered as hex because
// satori can't resolve CSS custom properties.
const BRAND_INTERACTIVE = "#5A32FB"; // --interactive-1
const ACCENT_YELLOW = "#FEEA9F"; // --accent-1
const NEUTRAL_1 = "#34435F"; // --neutral-1

const BYTESCALE_ACCOUNT_ID = "12a1yek";

// @vercel/og (satori) only understands TTF/OTF/WOFF — *not* WOFF2. Spoofing an
// older User-Agent makes Google Fonts return plain .ttf URLs in the CSS. The
// CSS also contains multiple @font-face blocks (devanagari, latin-ext, latin,
// …); we target the `/* latin */` marker so we always fetch Latin glyphs.
async function loadFont(
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
    const fontRes = await fetch(fontUrl);
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch (err) {
    console.warn("[list/opengraph-image] font fetch failed", family, err);
    return null;
  }
}

// Satori can't decode WebP, which is what Bytescale (upcdn.io) returns by
// default. Route through Bytescale's `/image/` processor with `f=jpg` so OG
// crawlers receive a JPEG. Only applies when the source is a Bytescale URL
// *on our account* — we don't want to rewrite arbitrary external URLs, nor
// cross-account upcdn.io URLs, into bogus `/{BYTESCALE_ACCOUNT_ID}/image/…`
// paths that would 404.
function transformImage(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== "upcdn.io") return url;
  if (!parsed.pathname.startsWith(`/${BYTESCALE_ACCOUNT_ID}/`)) return url;
  const filePath = extractFilePath(url);
  if (!filePath) return url;
  return Bytescale.UrlBuilder.url({
    accountId: BYTESCALE_ACCOUNT_ID,
    filePath,
    options: {
      transformation: "image",
      transformationParams: {
        w: 360,
        h: 640,
        fit: "crop",
        f: "jpg",
        q: 82,
      },
    },
  });
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function OgImage({ params }: Props) {
  const { slug } = await params;

  let data: Awaited<ReturnType<typeof fetchOgData>> | null = null;
  try {
    data = await fetchOgData(slug);
  } catch (err) {
    console.error("[list/opengraph-image] convex query failed", err);
    data = null;
  }

  if (data?.status !== "ok" || data.upcomingEvents.length === 0) {
    return new ImageResponse(renderBrandedDefault(), {
      width: size.width,
      height: size.height,
    });
  }

  const { list, owner, upcomingEvents } = data;
  const [mediumFont, boldFont, kalamFont] = await Promise.all([
    loadFont("IBM Plex Sans", 500),
    loadFont("IBM Plex Sans", 700),
    loadFont("Kalam", 700),
  ]);

  const fonts = [
    mediumFont
      ? {
          name: "IBM Plex Sans",
          data: mediumFont,
          weight: 500 as const,
          style: "normal" as const,
        }
      : null,
    boldFont
      ? {
          name: "IBM Plex Sans",
          data: boldFont,
          weight: 700 as const,
          style: "normal" as const,
        }
      : null,
    kalamFont
      ? {
          name: "Kalam",
          data: kalamFont,
          weight: 700 as const,
          style: "normal" as const,
        }
      : null,
  ].filter((f): f is NonNullable<typeof f> => f !== null);

  // Layout variants per count so 1- and 2-event lists stay centered and
  // symmetric; only the 3-event variant fans out. The 3-card layout picks
  // translateX (±150) so outer cards peek out past the middle card's 224px
  // width; tilts fan outward so the stack reads as a scattered hand.
  const cardLayoutsByCount: Record<
    1 | 2 | 3,
    {
      width: number;
      height: number;
      rotate: string;
      translateX: number;
      zIndex: number;
    }[]
  > = {
    1: [
      { width: 240, height: 426, rotate: "4deg", translateX: 0, zIndex: 1 },
    ],
    2: [
      { width: 216, height: 384, rotate: "-8deg", translateX: -90, zIndex: 1 },
      { width: 216, height: 384, rotate: "8deg", translateX: 90, zIndex: 2 },
    ],
    3: [
      { width: 196, height: 348, rotate: "-14deg", translateX: -150, zIndex: 1 },
      { width: 224, height: 398, rotate: "6deg", translateX: 0, zIndex: 3 },
      { width: 196, height: 348, rotate: "-10deg", translateX: 150, zIndex: 2 },
    ],
  };
  const cardLayouts =
    cardLayoutsByCount[
      Math.min(upcomingEvents.length, 3) as 1 | 2 | 3
    ];
  const eventPillLabel = `${list.eventCount} ${list.eventCount === 1 ? "EVENT" : "EVENTS"}`;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        background: BRAND_INTERACTIVE,
        fontFamily: "IBM Plex Sans, sans-serif",
        color: "white",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 26,
          left: 32,
          display: "flex",
        }}
      >
        <svg
          width="44"
          height="60"
          viewBox={SOONLIST_MARK_VIEWBOX}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={SOONLIST_MARK_CARD_PATH} fill={ACCENT_YELLOW} />
          <path d={SOONLIST_MARK_GLYPH_PATH} fill={NEUTRAL_1} />
        </svg>
      </div>

      <div
        style={{
          position: "absolute",
          top: 30,
          right: 32,
          display: "flex",
          alignItems: "center",
          padding: "7px 16px",
          borderRadius: 999,
          background: ACCENT_YELLOW,
          color: NEUTRAL_1,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.08em",
        }}
      >
        {eventPillLabel}
      </div>

      <div
        style={{
          position: "absolute",
          top: 70,
          left: 0,
          right: 0,
          height: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {upcomingEvents.map((evt, i) => {
          const layout = cardLayouts[i] ?? cardLayouts[cardLayouts.length - 1]!;
          return (
            <img
              key={i}
              src={transformImage(evt.image)}
              width={layout.width}
              height={layout.height}
              alt=""
              style={{
                position: "absolute",
                width: layout.width,
                height: layout.height,
                objectFit: "cover",
                borderRadius: 16,
                border: "4px solid white",
                boxShadow: "0 24px 48px rgba(0, 0, 0, 0.35)",
                transform: `translateX(${layout.translateX}px) rotate(${layout.rotate})`,
                zIndex: layout.zIndex,
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 34,
          left: 36,
          right: 36,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Kalam, cursive",
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 0.95,
            letterSpacing: "-0.01em",
            maxWidth: "100%",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {list.name}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginTop: 12,
            opacity: 0.92,
          }}
        >
          {owner.userImage ? (
            <img
              src={owner.userImage}
              width={28}
              height={28}
              alt=""
              style={{
                width: 28,
                height: 28,
                borderRadius: 9999,
                objectFit: "cover",
                border: "2px solid rgba(255, 255, 255, 0.85)",
              }}
            />
          ) : null}
          {owner.emoji ? (
            <div style={{ display: "flex", fontSize: 18 }}>{owner.emoji}</div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            Curated by {owner.displayName} · @{owner.username}
          </div>
        </div>
      </div>
    </div>,
    {
      width: size.width,
      height: size.height,
      ...(fonts.length > 0 ? { fonts } : {}),
    },
  );
}

async function fetchOgData(slug: string) {
  // Unauthenticated on purpose: keeps the route cacheable under ISR and
  // matches the query's crawler-facing semantics (private lists always
  // resolve to `status: "private"` without a viewer).
  const convex = getUnauthenticatedConvex();
  return convex.query(api.lists.getOgData, { slug });
}
