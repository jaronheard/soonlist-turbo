import type { FunctionReturnType } from "convex/server";
import type { Metadata } from "next";
import { Suspense } from "react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { getAuthenticatedConvex } from "~/lib/convex-server";
import { UpcomingPageClient } from "./UpcomingPageClient";

interface Props {
  params: Promise<{ userName: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userName } = await params;

  try {
    const convex = await getAuthenticatedConvex();
    const user = await convex.query(api.users.getByUsername, { userName });

    if (!user) {
      return {
        title: "User Not Found | Soonlist",
        description: "The requested user profile could not be found.",
      };
    }

    // Extract first name from displayName (first word) or fallback to username
    const userFirstName = user.displayName?.split(" ")[0] || userName;
    const title = `${userFirstName}'s Upcoming Events | Soonlist`;
    const description = `See ${userFirstName}'s upcoming events on Soonlist`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "profile",
        locale: "en_US",
        siteName: "Soonlist",
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for user profile:", error);

    return {
      title: "User Profile | Soonlist",
      description: "View upcoming events on Soonlist",
    };
  }
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UpcomingPageClient params={params} />
    </Suspense>
  );
}
