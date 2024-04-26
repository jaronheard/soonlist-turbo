import { ListCard } from "./ListCard";
import { EventList } from "@/components/EventList";
import { api } from "@/trpc/server";

export async function SampleList({ listId }: { listId: string }) {
  const list = await api.list.get.query({ listId });

  if (!list) {
    return <> </>;
  }

  const events = list.eventToLists
    .map((item) => item.event)
    // filter out null events
    .filter((event) => event?.startDateTime)
    // sort by startDateTime
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime()
    )
    // filter out past events
    .filter((event) => new Date(event.startDateTime) > new Date())
    // limit to 3 events
    .slice(-3);

  return (
    <div>
      <ListCard name={list.name} username={list.user.username} id={listId} />
      <div className="p-2"></div>
      <EventList
        currentEvents={[]}
        futureEvents={events}
        pastEvents={[]}
        showPrivateEvents={false}
        variant="future-minimal"
      />
    </div>
  );
}
