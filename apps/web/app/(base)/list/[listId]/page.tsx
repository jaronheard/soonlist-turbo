import type { Metadata, ResolvingMetadata } from "next/types";
import { currentUser } from "@clerk/nextjs/server";
import { EyeOff } from "lucide-react";

import { Badge } from "@soonlist/ui/badge";

import { EventList } from "~/components/EventList";
import { FollowListButton } from "~/components/FollowButtons";
import { ListDeleteButton } from "~/components/ListDeleteButton";
import { ListEditButton } from "~/components/ListEditButton";
import { UserInfo } from "~/components/UserInfo";
import { env } from "~/env";
import { api } from "~/trpc/server";

interface Props {
  params: { listId: string };
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const list = await api.list.get({ listId: params.listId });

  if (!list) {
    return {
      title: "No list found | Soonlist",
    };
  }

  const events = list.eventToLists
    .map((item) => item.event)
    // filter out null events
    .filter((event) => event.startDateTime)
    // sort by startDateTime
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime(),
    );

  const futureEvents = events.filter(
    (event) => event.startDateTime && event.startDateTime >= new Date(),
  );
  const futureEventsCount = futureEvents.length;
  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `${list.name} by @${list.user.username} | Soonlist`,
    openGraph: {
      title: `${list.name} by @${list.user.username} (${futureEventsCount} upcoming)`,
      description: `${list.description}`,
      url: `${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/list/${params.listId}`,
      type: "article",
      images: [...previousImages],
    },
  };
}

export default async function Page({ params }: Props) {
  const user = await currentUser();
  const list = await api.list.get({ listId: params.listId });

  if (!list) {
    return <> </>;
  }
  const events = list.eventToLists
    .map((item) => item.event)
    // filter out null events
    .filter((event) => event.startDateTime)
    // sort by startDateTime
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime(),
    );

  const pastEvents = events.filter((item) => item.endDateTime < new Date());

  const currentEvents = events.filter(
    (item) => item.startDateTime < new Date() && item.endDateTime > new Date(),
  );
  const futureEvents = events.filter(
    (item) => item.startDateTime >= new Date(),
  );

  const self = user?.username === list.user.username;
  const following =
    user && list.listFollows.find((item) => item.userId === user.id);

  return (
    <div className="">
      {list.visibility === "private" && (
        <>
          <Badge className="max-w-fit" variant="destructive">
            <EyeOff className="mr-2 inline size-4" /> Not discoverable
          </Badge>
          <div className="p-1"></div>
        </>
      )}
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24">
        <div className="flex flex-col gap-4 lg:sticky lg:top-32 lg:self-start">
          <p className="font-heading text-5xl font-bold leading-[3.5rem] tracking-tight text-neutral-1">
            {list.name}
          </p>
          <div className="flex gap-6">
            <p className="text-2xl font-bold leading-normal tracking-wide">
              Captured by
            </p>
            <UserInfo userId={list.user.id} />
          </div>
          <div className="text-2xl text-neutral-2">{list.description}</div>
          <div className="flex place-items-center gap-4">
            {!self && (
              <>
                <FollowListButton
                  listId={params.listId}
                  following={!!following}
                />
              </>
            )}
            <ListEditButton listId={params.listId} listUserId={list.user.id} />
            <ListDeleteButton
              listId={params.listId}
              listUserId={list.user.id}
            />
          </div>
        </div>
        <EventList
          currentEvents={currentEvents}
          futureEvents={futureEvents}
          pastEvents={pastEvents}
          showPrivateEvents={!!self}
          variant="card"
        />
      </div>
    </div>
  );
}
