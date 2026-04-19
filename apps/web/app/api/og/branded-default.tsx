import {
  SOONLIST_WORDMARK_PATHS,
  SOONLIST_WORDMARK_VIEWBOX,
} from "~/lib/brand-logo";

/**
 * Shared JSX for the branded-default OG image. Used by both
 * `apps/web/app/api/og/route.tsx` (top-level branded card) and
 * `apps/web/app/(base)/list/[slug]/opengraph-image.tsx` (fallback when a list
 * has no upcoming events to show). Returns the JSX tree only — callers wrap
 * it in their own `ImageResponse`.
 */
export function renderBrandedDefault() {
  return (
    <div
      style={{
        display: "flex",
        fontSize: 40,
        color: "black",
        background: "#f2edff",
        width: "100%",
        height: "100%",
        textAlign: "center",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <svg
        width="159"
        height="43"
        viewBox={SOONLIST_WORDMARK_VIEWBOX}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "795px", height: "215px" }}
      >
        {SOONLIST_WORDMARK_PATHS.map((p, i) => (
          <path key={i} d={p.d} fill={p.fill} />
        ))}
      </svg>
    </div>
  );
}
