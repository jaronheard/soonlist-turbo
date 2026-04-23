import {
  SOONLIST_WORDMARK_PATHS,
  SOONLIST_WORDMARK_VIEWBOX,
} from "~/lib/brand-logo";

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
