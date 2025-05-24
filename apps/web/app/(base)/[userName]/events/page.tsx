import { env } from "process";
import type { Metadata, ResolvingMetadata } from "next/types";
import { currentUser } from "@clerk/nextjs/server";

import { EventList } from "~/components/EventList";
import { ListCardsForUser } from "~/components/ListCardsForUser";
import { UserInfo } from "~/components/UserInfo";
import { api } from "~/trpc/server";

interface Props {
  params: Promise<{ userName: string }>;
}

export async function generateMetadata(props: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const params = await props.params;
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

export default async function Page(props: Props) {
  const params = await props.params;
  const activeUser = await currentUser();
  const self = activeUser?.username === params.userName;
  const events = await api.event.getForUser({
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
    <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24">
      <div className="flex flex-col gap-4 lg:sticky lg:top-32 lg:self-start">
        <UserInfo userName={params.userName} variant="description" />
        <ListCardsForUser userName={params.userName} limit={10} />
      </div>
      <EventList
        currentEvents={currentEvents}
        pastEvents={pastEvents}
        futureEvents={futureEvents}
        hideCurator
        showOtherCurators={true}
        showPrivateEvents={self}
        variant="future-minimal"
        forceSingleColumn
      />
    </div>
  );
}
