import { SUPPORTS_LIQUID_GLASS } from "~/hooks/useLiquidGlass";

// iOS 26 renders an inline large-title bar with its own blurred chrome as
// content scrolls under it, so we want fully transparent headers there.
// On iOS <26 a transparent header with no blur lets scroll content bleed
// into the title and controls and makes them unreadable — fall back to a
// light system-chrome blur so the native nav bar stays legible.
export const HEADER_BLUR_EFFECT = SUPPORTS_LIQUID_GLASS
  ? "none"
  : "systemChromeMaterialLight";
