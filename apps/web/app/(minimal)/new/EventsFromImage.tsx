"use client";

import React from "react";
import { blankEvent } from "@soonlist/cal";

import { AddToCalendarCard } from "~/components/AddToCalendarCard";
import { buildDefaultUrl } from "~/components/ImageUpload";
import { useNewEventContext } from "~/context/NewEventContext";
import { api } from "~/trpc/react";
import { EventPreviewLoadingSpinner } from "./EventPreviewLoadingSpinner";
import { EventsError } from "./EventsError";
import { NewEventPreview } from "./NewEventPreview";

const queryOptions = {
  // only retry once
  retry: 1,
  retryDelay: 250,
  // don't refetch on mount, window focus, or reconnect
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  // stale time of 1 day
  staleTime: 1000 * 60 * 60 * 24,
};

export function EventsFromImage({
  filePath,
  timezone,
  LoadingComponent = EventPreviewLoadingSpinner,
  processOnly = false,
}: {
  filePath: string;
  timezone: string;
  LoadingComponent?: React.ComponentType<{ className?: string }>;
  processOnly?: boolean;
}) {
  const { setEventData } = useNewEventContext();
  const fromImage = api.ai.eventFromImage.useQuery(
    {
      imageUrl: buildDefaultUrl(filePath),
      timezone,
    },
    queryOptions,
  );

  const { events, response } = fromImage.data ?? {};

  // Set eventData when events are available
  React.useEffect(() => {
    if (events && events.length > 0) {
      // Ensure the event has the image URL set
      const eventWithImage = {
        ...events[0],
        // Safely add images property
        images:
          events[0] && "images" in events[0]
            ? (events[0] as any).images
            : [buildDefaultUrl(filePath)],
      };
      console.log("Setting event data with image:", eventWithImage);
      setEventData(eventWithImage);
    }
  }, [events, setEventData, filePath]);

  // Log when component mounts and unmounts
  React.useEffect(() => {
    console.log("EventsFromImage mounted with filePath:", filePath);
    return () => {
      console.log("EventsFromImage unmounted");
    };
  }, [filePath]);

  if (fromImage.isPending) {
    return processOnly ? null : <LoadingComponent className="h-64" />;
  }

  if (!events || events.length === 0) {
    return processOnly ? null : (
      <>
        <EventsError
          rawText={`image url: ${buildDefaultUrl(filePath)}`}
          response={response || undefined}
        />
        <div className="p-4"></div>
        <AddToCalendarCard {...blankEvent} hideFloatingActionButtons />
      </>
    );
  }

  if (events.length >= 0) {
    return processOnly ? null : (
      <div className="flex flex-wrap items-center gap-8">
        {events.map((props) => (
          <NewEventPreview key={props.name} {...props} />
        ))}
      </div>
    );
  }
}
