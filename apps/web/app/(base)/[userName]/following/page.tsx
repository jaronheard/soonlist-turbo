import type { Metadata, ResolvingMetadata } from "next/types";
import { Suspense } from "react";

import { EventList } from "~/components/EventList";
import { UserInfo } from "~/components/UserInfo";
import { api } from "~/trpc/server";

interface Props {
  params: { userName: string };
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const events = await api.event.getFollowingForUser({
    userName: params.userName,
  });

  if (!events) {
    return {
      title: "No events found | Soonlist",
      openGraph: {
        images: [],
      },
    };
  }

  const futureEvents = events.filter(
    (item) => item.startDateTime >= new Date(),
  );
  const futureEventsCount = futureEvents.length;

  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `@${params.userName} is following (${futureEventsCount} upcoming events) | Soonlist`,
    openGraph: {
      title: `@${params.userName} is following (${futureEventsCount} upcoming events)`,
      description: `See the events @${params.userName} is following on  Soonlist`,
      url: `${process.env.NEXT_PUBLIC_VERCEL_URL}/${params.userName}/following`,
      type: "article",
      images: [...previousImages],
    },
  };
}

export default async function Page({ params }: Props) {
  const events = await api.event.getFollowingForUser({
    userName: params.userName,
  });
  const pastEvents = events.filter((item) => item.endDateTime < new Date());

  const currentEvents = events.filter(
    (item) => item.startDateTime < new Date() && item.endDateTime > new Date(),
  );
  const futureEvents = events.filter(
    (item) => item.startDateTime >= new Date(),
  );

  return (
    <>
      <div className="flex place-items-center gap-2">
        <div className="font-medium">Events from lists followed by</div>
        <Suspense>
          <UserInfo userName={params.userName} />
        </Suspense>
      </div>
      <div className="p-4"></div>
      <h2 className="text-sm font-medium text-gray-500">All Events</h2>
      <EventList
        pastEvents={pastEvents}
        futureEvents={futureEvents}
        currentEvents={currentEvents}
      />
      <div className="p-5"></div>
    </>
  );
}
