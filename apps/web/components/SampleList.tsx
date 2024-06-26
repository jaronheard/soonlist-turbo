import { EventList } from "~/components/EventList";
import { api } from "~/trpc/server";
import { ListCard } from "./ListCard";

export async function SampleList({ listId }: { listId: string }) {
  const list = await api.list.get({ listId });

  if (!list) {
    return <> </>;
  }

  const events = list.eventToLists
    .map((item) => item.event)
    // filter out null events
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    .filter((event) => event?.startDateTime)
    // sort by startDateTime
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime(),
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
