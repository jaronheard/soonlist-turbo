import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";

import { api } from "@soonlist/backend/convex/_generated/api";

import { getAuthenticatedConvex } from "~/lib/convex-server";
import ListPageClient from "./ListPageClient";
import { PrivateListState } from "./PrivateListState";

interface Props {
  params: Promise<{ slug: string }>;
}

const APP_STORE_ID = "6670222216";
const APPLE_ITUNES_APP = (slug: string) =>
  `app-id=${APP_STORE_ID}, app-argument=https://www.soonlist.com/list/${slug}`;

const fetchListBySlug = cache(async (slug: string) => {
  const convex = await getAuthenticatedConvex();
  return convex.query(api.lists.getBySlug, { slug });
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const result = await fetchListBySlug(slug);

    if (result.status === "notFound") {
      return {
        title: "List not found · Soonlist",
        description: "The requested list could not be found.",
        robots: { index: false, follow: false },
      };
    }

    if (result.status === "private") {
      const ownerLabel = result.owner?.username
        ? `@${result.owner.username}`
        : "a Soonlist user";
      return {
        title: "Private list · Soonlist",
        description: `This list by ${ownerLabel} is private.`,
        robots: { index: false, follow: false },
        // Explicitly point to the branded default so Next doesn't auto-wire
        // the dynamic opengraph-image route (which would still render the
        // branded default for private lists, but this skips the extra hop).
        openGraph: {
          images: [{ url: "/api/og", width: 1200, height: 630 }],
        },
        other: {
          "apple-itunes-app": APPLE_ITUNES_APP(slug),
        },
      };
    }

    const { list } = result;
    const ownerHandle = list.owner?.username ?? "soonlist";
    const ownerDisplay = list.owner?.displayName ?? ownerHandle;
    const autoDescription = `Curated by ${ownerDisplay} · @${ownerHandle}`;
    const description =
      list.description && list.description.trim().length > 0
        ? list.description
        : autoDescription;
    const title = `${list.name} · Soonlist`;
    const imageAlt = `${list.name} — a list on Soonlist by @${ownerHandle}`;

    // Next's file-based `opengraph-image.tsx` convention auto-wires the image
    // URL into og:image + twitter:image, so we don't set them manually here.
    // We do upgrade `twitter:card` to `summary_large_image` since the dynamic
    // route produces a 1200×630 rich card.
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        siteName: "Soonlist",
        locale: "en_US",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
      other: {
        "apple-itunes-app": APPLE_ITUNES_APP(slug),
        "og:image:alt": imageAlt,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for list:", error);
    return {
      title: "List · Soonlist",
      description:
        "An error occurred while loading list information. Please try again later.",
      robots: { index: false, follow: true },
    };
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params;

  const result = await fetchListBySlug(slug);

  if (result.status === "notFound") {
    notFound();
  }

  if (result.status === "private") {
    return <PrivateListState owner={result.owner} />;
  }

  return <ListPageClient slug={slug} />;
}
