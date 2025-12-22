"use client";

import type { FunctionReturnType } from "convex/server";
import Image from "next/image";
import Link from "next/link";
import { usePaginatedQuery } from "convex/react";
import { Globe2, Grid3X3, List } from "lucide-react";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import { UserProfileFlair } from "~/components/UserProfileFlair";
import { useStableTimestamp } from "~/hooks/useStableQuery";

interface PosterEvent {
  id: string;
  name: string;
  images: string[];
  user: {
    username: string;
    displayName: string;
    userImage: string;
  };
  endDateTime: Date;
  startDateTime: Date;
}

// Extract first image from event
function getFirstImage(
  event: AddToCalendarButtonPropsRestricted,
): string | null {
  if (!event.images) return null;
  if (typeof event.images === "string") return event.images;
  if (Array.isArray(event.images) && event.images.length > 0)
    return event.images[0]!;
  return null;
}

// Transform Convex events to poster format
function transformToPosterEvents(
  events: FunctionReturnType<typeof api.feeds.getDiscoverFeed>["page"],
): PosterEvent[] {
  return events
    .map((event) => {
      const eventData = event.event as AddToCalendarButtonPropsRestricted;
      const image = getFirstImage(eventData);
      if (!image || !event.user) return null;

      return {
        id: event.id,
        name: eventData.name || "Untitled Event",
        images: [image],
        user: {
          username: event.user.username,
          displayName: event.user.displayName,
          userImage: event.user.userImage,
        },
        endDateTime: new Date(event.endDateTime),
        startDateTime: new Date(event.startDateTime),
      };
    })
    .filter((e): e is PosterEvent => e !== null);
}

export default function PostersPage() {
  const stableNow = useStableTimestamp();
  const { results, status } = usePaginatedQuery(
    api.feeds.getDiscoverFeed,
    {
      filter: "upcoming",
    },
    { initialNumItems: 50 },
  );

  const isLoading = status === "LoadingFirstPage";
  const posterEvents = results ? transformToPosterEvents(results) : [];

  // Client-side filter: only show events that haven't ended
  const visibleEvents = posterEvents.filter(
    (event) => event.endDateTime >= stableNow,
  );

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-interactive-1">
          <div className="flex items-center gap-4">
            <Globe2 className="size-6 text-interactive-1" />
            Discover
          </div>
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/explore"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-neutral-2 transition-colors hover:bg-interactive-3 hover:text-neutral-1"
            aria-label="List view"
          >
            <List className="size-5" />
          </Link>
          <div
            className="flex items-center gap-2 rounded-lg bg-interactive-2 px-3 py-2 text-interactive-1"
            aria-label="Poster view (current)"
          >
            <Grid3X3 className="size-5" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-lg bg-interactive-3"
            />
          ))}
        </div>
      ) : visibleEvents.length === 0 ? (
        <p className="text-lg text-gray-500">No events with posters found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visibleEvents.map((event) => (
            <div key={event.id} className="group relative">
              <Link href={`/event/${event.id}`} className="block">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-interactive-3">
                  <Image
                    src={event.images[0]!}
                    alt={event.name}
                    fill
                    className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  {/* Gradient overlay for text readability */}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
                </div>
              </Link>
              {/* User info and date overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/${event.user.username}/upcoming`}
                    className="flex min-w-0 items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <UserProfileFlair username={event.user.username} size="xs">
                      <Image
                        src={event.user.userImage}
                        alt={`${event.user.displayName}'s profile`}
                        width={24}
                        height={24}
                        className="size-6 rounded-full object-cover ring-2 ring-white/50"
                      />
                    </UserProfileFlair>
                    <span className="truncate text-sm font-medium text-white drop-shadow-md">
                      {event.user.displayName}
                    </span>
                  </Link>
                  <span className="flex-shrink-0 text-sm font-medium text-white drop-shadow-md">
                    {event.startDateTime.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="p-6"></div>
    </div>
  );
}
