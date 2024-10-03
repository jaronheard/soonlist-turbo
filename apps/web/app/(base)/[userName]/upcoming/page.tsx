import type { Metadata, ResolvingMetadata } from "next/types";
import { currentUser } from "@clerk/nextjs/server";
import { CalendarHeart } from "lucide-react";

import { EventList } from "~/components/EventList";
import { UserInfo } from "~/components/UserInfo";
import { env } from "~/env";
import { api } from "~/trpc/server";

interface Props {
  params: { userName: string };
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const events = await api.event.getForUser({
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
    title: `@${params.userName} (${futureEventsCount} upcoming events) | Soonlist`,
    openGraph: {
      title: `@${params.userName} (${futureEventsCount} upcoming events)`,
      description: `See the events that @${params.userName} has saved on Soonlist`,
      url: `${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/${params.userName}/events`,
      type: "article",
      images: [...previousImages],
    },
  };
}

export default async function Page({ params }: Props) {
  const activeUser = await currentUser();
  const self = activeUser?.username === params.userName;
  const events = await api.event.getUpcomingForUser({
    userName: params.userName,
  });

  // const pastEvents = events.filter((item) => item.endDateTime < new Date());

  const currentEvents = events.filter(
    (item) => item.startDateTime < new Date() && item.endDateTime > new Date(),
  );
  const futureEvents = events.filter(
    (item) => item.startDateTime >= new Date(),
  );

  return (
    <div className="mx-auto max-w-2xl">
      {self ? (
        <h1 className="mb-4 font-heading text-2xl font-bold leading-[1.08333] tracking-tight text-neutral-1 ">
          <div className="flex gap-4">
            <CalendarHeart className="size-6" />
            My Feed
          </div>
        </h1>
      ) : (
        <>
          <UserInfo userName={params.userName} />
          <div className="p-2"></div>
        </>
      )}
      <EventList
        currentEvents={currentEvents}
        pastEvents={[]}
        futureEvents={futureEvents}
        hideCurator
        showOtherCurators={true}
        showPrivateEvents={self}
        variant="future-minimal"
      />
    </div>
  );
}
