import type { Metadata, ResolvingMetadata } from "next/types";

import { FollowListButton } from "~/components/FollowButtons";
import { ListCard } from "~/components/ListCard";
import { UserInfo } from "~/components/UserInfo";
import { api } from "~/trpc/server";

interface Props {
  params: { userName: string };
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const lists = await api.list.getFollowing({
    userName: params.userName,
  });
  const listCount = lists.length;
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `@${params.userName} is following (${listCount} lists) | Soonlist`,
    openGraph: {
      title: `@${params.userName} is following (${listCount} lists)`,
      description: `See the lists @${params.userName} is following on  Soonlist`,
      url: `${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/${params.userName}/following/users`,
      type: "article",
      images: [...previousImages],
    },
  };
}

export default async function Page({ params }: Props) {
  const lists = await api.list.getFollowing({
    userName: params.userName,
  });

  return (
    <>
      <h2 className="text-sm font-medium text-gray-500">Following Lists</h2>
      <ul role="list" className="mt-3 grid gap-4">
        {lists.map((list) => (
          <div
            key={list.name}
            className="flex flex-col items-center gap-4 sm:flex-row"
          >
            <ListCard
              key={list.name}
              name={list.name}
              id={list.id}
              username={list.user.username}
            />
            <FollowListButton listId={list.id} following={true} />
            <UserInfo userName={list.user.username} />
          </div>
        ))}
      </ul>
      <div className="p-8"></div>
    </>
  );
}
