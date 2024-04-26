"use client";

import { EventsError } from "./EventsError";
import { EventPreviewLoadingSpinner } from "./EventPreviewLoadingSpinner";
import { NewEventPreview } from "./NewEventPreview";
import { AddToCalendarCard } from "@/components/AddToCalendarCard";
import { blankEvent } from "@/lib/utils";
import { buildDefaultUrl } from "@/components/ImageUpload";
import { api } from "@/trpc/react";

const queryOptions = {
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
    queryOptions
  );

  const { events, response } = fromImage.data ?? {};

  if (fromImage.isLoading) {
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
