import { EventList } from "@/components/EventList";
import { api } from "@/trpc/server";

export default async function Page() {
  const events = await api.event.getNext.query({ limit: 50 });

  const pastEvents = events.filter((item) => item.endDateTime < new Date());

  const currentEvents = events.filter(
    (item) => item.startDateTime < new Date() && item.endDateTime > new Date()
  );
  const futureEvents = events.filter(
    (item) => item.startDateTime >= new Date()
  );
  return (
    <>
      <div className="p-4"></div>
      <h1 className="font-heading text-6xl font-bold leading-[0.875] tracking-tighterish text-gray-700 md:text-8xl md:leading-[0.875]">
        Discover
      </h1>
      <p className="mt-6 max-w-[30rem] text-2xl leading-9 text-gray-400">
        Discover events from early access users
      </p>
      <EventList
        currentEvents={currentEvents}
        futureEvents={futureEvents}
        pastEvents={pastEvents}
        variant="card"
      />
      <div className="p-6"></div>
    </>
  );
}
