"use client";

import { EventsError } from "./EventsError";
import { NewEventPreview } from "./NewEventPreview";
import { EventPreviewLoadingSpinner } from "./EventPreviewLoadingSpinner";
import { api } from "@/trpc/react";
import { AddToCalendarCard } from "@/components/AddToCalendarCard";
import { blankEvent } from "@/lib/utils";

const queryOptions = {
  // don't refetch on mount, window focus, or reconnect
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  // stale time of 1 day
  staleTime: 1000 * 60 * 60 * 24,
};

export function EventsFromRawText({
  rawText,
  timezone,
}: {
  rawText: string;
  timezone: string;
}) {
  const fromRawText = api.ai.eventFromRawText.useQuery(
    {
      rawText,
      timezone,
    },
    queryOptions
  );

  const { events, response } = fromRawText.data ?? {};

  if (fromRawText.isLoading) {
    return <EventPreviewLoadingSpinner className="h-64" />;
  }

  if (!events || events.length === 0) {
    return (
      <>
        <EventsError rawText={rawText} response={response || undefined} />
        <div className="p-4"></div>
        <AddToCalendarCard {...blankEvent} />
      </>
    );
  }

  if (events.length >= 0) {
    return (
      <div className="flex flex-wrap items-center gap-8">
        {events?.map((props) => (
          <NewEventPreview key={props.name} {...props} />
        ))}
      </div>
    );
  }
}
