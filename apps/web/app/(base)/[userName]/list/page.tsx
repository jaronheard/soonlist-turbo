import type { Metadata } from "next";

import { api } from "@soonlist/backend/convex/_generated/api";

import { getAuthenticatedConvex } from "~/lib/convex-server";
import PublicListClient from "./PublicListClient";

interface Props {
  params: Promise<{ userName: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userName } = await params;

  try {
    // Get an authenticated Convex client for server-side fetching
    const convex = await getAuthenticatedConvex();

    // Fetch the public list data
    const publicListData = await convex.query(api.users.getPublicList, {
      username: userName,
    });

    if (!publicListData?.user) {
      return {
        title: `@${userName} | Soonlist`,
        description: `Check out ${userName}'s events on Soonlist`,
      };
    }

    const listName =
      publicListData.user.publicListName ||
      `${publicListData.user.displayName}'s events`;

    return {
      title: `${listName} | Soonlist`,
      description: `Check out ${publicListData.user.displayName}'s events on Soonlist`,
      openGraph: {
        title: `${listName} | Soonlist`,
        description: `Check out ${publicListData.user.displayName}'s events on Soonlist`,
        type: "website",
      },
      twitter: {
        card: "summary",
        title: `${listName} | Soonlist`,
        description: `Check out ${publicListData.user.displayName}'s events on Soonlist`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for public list:", error);
    return {
      title: `@${userName} | Soonlist`,
      description: "Check out events on Soonlist",
    };
  }
}

export default function PublicListPage({ params }: Props) {
  return <PublicListClient params={params} />;
}