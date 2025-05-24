"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const PostHogPageView = dynamic(() => import("./PostHogPageView"), {
  ssr: false,
});

export default function PostHogClient() {
  return (
    <Suspense>
      <PostHogPageView />
    </Suspense>
  );
}
