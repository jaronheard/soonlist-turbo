import { ImageResponse } from "next/og";

import { renderBrandedDefault } from "./branded-default";

export async function GET() {
  return new ImageResponse(renderBrandedDefault(), {
    width: 1200,
    height: 630,
  });
}
