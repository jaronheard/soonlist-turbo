"use client";

import { useEffect, useState } from "react";

import { Button } from "@soonlist/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@soonlist/ui/dialog";

import type { AddToCalendarCardProps } from "~/components/AddToCalendarCard";
import { AddToCalendarCard } from "~/components/AddToCalendarCard";
import { EventPreview } from "~/components/EventDisplays";
import { useNewEventContext } from "~/context/NewEventContext";
import {
  Mode,
  useNewEventProgressContext,
} from "~/context/NewEventProgressContext";

export function NewEventPreview(initialProps: AddToCalendarCardProps) {
  const [event, setEvent] = useState(initialProps);
  const { mode, setMode } = useNewEventProgressContext();
  const { setEventData } = useNewEventContext();

  useEffect(() => {
    setEventData(event);
  }, [event, setEventData]);

  // if (mode === Mode.Edit) {
  //   return (
  //     <div className="mx-auto pb-4 sm:w-[30rem] md:w-[36rem]">
  //       <AddToCalendarCard
  //         {...event}
  //         onUpdate={setEvent}
  //         hideFloatingActionButtons
  //       />
  //     </div>
  //   );
  // }
  return (
    <div className="mx-auto sm:w-[30rem] md:w-[36rem]">
      {mode === Mode.Edit && (
        <Dialog open={true} onOpenChange={() => setMode(Mode.View)}>
          <DialogContent className="overflow-hidden">
            <div className="-m-6 mb-0 max-h-[80dvh] overflow-y-auto">
              <AddToCalendarCard
                {...event}
                onUpdate={setEvent}
                hideFloatingActionButtons
                hideBorder
              />
            </div>
            <DialogFooter className="-m-6 rounded-b-md border-t border-neutral-3 bg-white p-6">
              <Button type="submit" onClick={() => setMode(Mode.View)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <EventPreview
        user={undefined}
        eventFollows={[]}
        comments={[]}
        id={""}
        createdAt={undefined}
        event={event}
        visibility="public"
      />
    </div>
  );
}
