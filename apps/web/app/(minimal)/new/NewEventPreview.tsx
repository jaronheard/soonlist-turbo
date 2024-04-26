"use client";

import { useEffect, useState } from "react";
import {
  AddToCalendarCard,
  type AddToCalendarCardProps,
} from "@/components/AddToCalendarCard";
import { EventPreview } from "@/components/EventDisplays";
import {
  Mode,
  useNewEventProgressContext,
} from "@/context/NewEventProgressContext";
import { useNewEventContext } from "@/context/NewEventContext";

export function NewEventPreview(initialProps: AddToCalendarCardProps) {
  const [event, setEvent] = useState(initialProps);
  const { mode } = useNewEventProgressContext();
  const { setEventData } = useNewEventContext();

  useEffect(() => {
    setEventData(event);
  }, [event, setEventData]);

  if (mode === Mode.Edit) {
    return (
      <div className="pb-4">
        <AddToCalendarCard {...event} onUpdate={setEvent} />
      </div>
    );
  }
  return (
    <EventPreview
      user={undefined}
      eventFollows={[]}
      comments={[]}
      id={""}
      createdAt={undefined}
      event={event}
      visibility="public"
    />
  );
}
