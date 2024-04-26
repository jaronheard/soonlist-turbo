import { type Metadata, type ResolvingMetadata } from "next/types";
import { currentUser } from "@clerk/nextjs/server";
import { UserInfo } from "@/components/UserInfo";
import { ListCardsForUser } from "@/components/ListCardsForUser";
import { EventList } from "@/components/EventList";
import { api } from "@/trpc/server";

type Props = { params: { userName: string } };

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const events = await api.event.getForUser.query({
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
    (item) => item.startDateTime >= new Date()
  );

  const futureEventsCount = futureEvents.length;

  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `@${params.userName} (${futureEventsCount} upcoming events) | Soonlist`,
    openGraph: {
      title: `@${params.userName} (${futureEventsCount} upcoming events)`,
      description: `See the events that @${params.userName} has saved on Soonlist`,
      url: `${process.env.NEXT_PUBLIC_URL}/${params.userName}/events`,
      type: "article",
      images: [...previousImages],
    },
  };
}

export default async function Page({ params }: Props) {
  const activeUser = await currentUser();
  const self = activeUser?.username === params.userName;
  const events = await api.event.getForUser.query({
    userName: params.userName,
  });

  const pastEvents = events.filter((item) => item.endDateTime < new Date());

  const currentEvents = events.filter(
    (item) => item.startDateTime < new Date() && item.endDateTime > new Date()
  );
  const futureEvents = events.filter(
    (item) => item.startDateTime >= new Date()
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
      />
    </div>
  );
}
