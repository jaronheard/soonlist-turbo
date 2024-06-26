"use client";

import { blankEvent } from "@soonlist/cal";

import { AddToCalendarCard } from "~/components/AddToCalendarCard";
import { buildDefaultUrl } from "~/components/ImageUpload";
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
}: {
  filePath: string;
  timezone: string;
}) {
  const fromImage = api.ai.eventFromImage.useQuery(
    {
      imageUrl: buildDefaultUrl(filePath),
      timezone,
    },
    queryOptions,
  );

  const { events, response } = fromImage.data ?? {};

  if (fromImage.isPending) {
    return <EventPreviewLoadingSpinner className="h-64" />;
  }

  if (!events || events.length === 0) {
    return (
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
    return (
      <div className="flex flex-wrap items-center gap-8">
        {events.map((props) => (
          <NewEventPreview key={props.name} {...props} />
        ))}
      </div>
    );
  }
}
