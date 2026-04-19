import { ImageResponse } from "next/og";

import { renderBrandedDefault } from "./branded-default";

// App router includes @vercel/og.
// No need to install it.

export async function GET() {
  return new ImageResponse(renderBrandedDefault(), {
    width: 1200,
    height: 630,
  });
}
