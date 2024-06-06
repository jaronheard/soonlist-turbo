// import { Suspense } from "react";
import type { Metadata, ResolvingMetadata } from "next/types";

import { UserInfo } from "~/components/UserInfo";
import { env } from "~/env";
// import Leaderboard from "~/components/Leaderboard";
// import LeaderboardSkeleton from "~/components/LeaderboardSkeleton";
// import {
//   Card,
//   CardHeader,
//   CardTitle,
//   CardDescription,
//   CardContent,
// } from "@soonlist/ui/card";
import { api } from "~/trpc/server";

export async function generateMetadata(
  // eslint-disable-next-line no-empty-pattern
  {},
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `All users | Soonlist`,
    openGraph: {
      title: `All users`,
      description: `See all users on  Soonlist`,
      url: `${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/users`,
      type: "article",
      images: [...previousImages],
    },
  };
}

export default async function Page() {
  const users = await api.user.getAll();

  return (
    <div className="mx-auto max-w-2xl">
      {/* <Card>
        <CardHeader>
          <CardTitle>Top Users</CardTitle>
          <CardDescription>Most Upcoming Events</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LeaderboardSkeleton />}>
            <Leaderboard />
          </Suspense>
        </CardContent>
      </Card>
      <div className="p-4"></div> */}
      <div className="flex place-items-center">
        <p className="font-heading text-5xl font-bold leading-[3.5rem] tracking-tight text-neutral-1">
          All users
        </p>
      </div>
      <div className="p-4"></div>
      <div className="grid grid-cols-1 gap-4">
        {users.map((user) => (
          <UserInfo key={user.username} userName={user.username} />
        ))}
      </div>
      <div className="p-4"></div>
    </div>
  );
}
