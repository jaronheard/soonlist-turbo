import { Globe, Globe2 } from "lucide-react";

import { EventList } from "~/components/EventList";
import { api } from "~/trpc/server";

export default async function Page() {
  const events = await api.event.getNext({ limit: 50 });

  const pastEvents = events.filter((item) => item.endDateTime < new Date());

  const currentEvents = events.filter(
    (item) => item.startDateTime < new Date() && item.endDateTime > new Date(),
  );
  const futureEvents = events.filter(
    (item) => item.startDateTime >= new Date(),
  );
  return (
    <>
      <h1 className="-mt-8 mb-4 font-heading text-4xl font-bold leading-[1.08333] tracking-tight text-gray-800 md:text-5xl">
        <div className="flex gap-4">
          <Globe2 className="size-10" />
          Discover
        </div>
      </h1>
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
