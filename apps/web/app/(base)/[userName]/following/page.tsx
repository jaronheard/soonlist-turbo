import type { Metadata, ResolvingMetadata } from "next/types";
import { Suspense } from "react";

import { EventList } from "~/components/EventList";
import { UserInfo } from "~/components/UserInfo";
import { env } from "~/env";
import { api } from "~/trpc/server";

interface Props {
  params: Promise<{ userName: string }>;
}

export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const params = await props.params;
  const events = await api.event.getFollowingUpcomingForUser({
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
      url: `${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/${params.userName}/following`,
      type: "article",
      images: [...previousImages],
    },
  };
}

export default async function Page(props: Props) {
  const params = await props.params;
  const events = await api.event.getFollowingUpcomingForUser({
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
        <div className="font-medium">
          Events from lists and users followed by
        </div>
        <Suspense>
          <UserInfo userName={params.userName} />
        </Suspense>
      </div>
      <div className="p-4"></div>
      <EventList
        pastEvents={pastEvents}
        futureEvents={futureEvents}
        currentEvents={currentEvents}
        variant="future-minimal"
      />
      <div className="p-5"></div>
    </>
  );
}
