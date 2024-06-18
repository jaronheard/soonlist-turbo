"use client";

import { blankEvent } from "@soonlist/cal";

import { AddToCalendarCard } from "~/components/AddToCalendarCard";
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

export function EventsFromUrl({
  url,
  timezone,
}: {
  url: string;
  timezone: string;
}) {
  const fromUrl = api.ai.eventsFromUrl.useQuery(
    {
      url,
      timezone,
    },
    queryOptions,
  );

  const { events, response } = fromUrl.data ?? {};

  if (fromUrl.isPending) {
    return <EventPreviewLoadingSpinner className="h-64" />;
  }

  if (!events || events.length === 0) {
    return (
      <>
        <EventsError rawText={url} response={response || undefined} />
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
