"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Instagram } from "lucide-react";

import type { EventMetadata } from "@soonlist/cal";
import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";

function formatTimeAgo(timestamp: number | undefined): string {
  if (!timestamp) return "Never";
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Less than an hour ago";
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function ProfileLinkCard({ username }: { username: string }) {
  return (
    <div className="rounded-lg border border-neutral-3 p-4">
      <div className="flex items-center gap-2">
        <Instagram className="size-5 text-neutral-1" />
        <h1 className="text-xl font-bold text-neutral-1">@{username}</h1>
      </div>
      <Link
        href={`https://instagram.com/${username}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-sm text-interactive-1 hover:underline"
      >
        View on Instagram &rarr;
      </Link>
    </div>
  );
}

function EventListItem({
  event,
}: {
  event: {
    id: string;
    name?: string;
    startDateTime: string;
    location?: string;
    description?: string;
    eventMetadata?: unknown;
  };
}) {
  const metadata = event.eventMetadata as EventMetadata | undefined;
  const sourceUrls = metadata?.sourceUrls || [];

  return (
    <div className="rounded-lg border border-neutral-3 p-4">
      <Link
        href={`/event/${event.id}`}
        className="text-lg font-semibold text-interactive-1 hover:underline"
      >
        {event.name || "Untitled Event"}
      </Link>
      <div className="mt-1 text-sm text-neutral-2">
        {new Date(event.startDateTime).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </div>
      {event.location && (
        <div className="mt-1 text-sm text-neutral-2">{event.location}</div>
      )}
      {sourceUrls.length > 0 && (
        <div className="mt-2">
          <Link
            href={sourceUrls[0]!}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-interactive-1 hover:underline"
          >
            View original post
          </Link>
        </div>
      )}
    </div>
  );
}

export default function InstagramUsernamePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  const sourceInfo = useQuery(api.instagramSources.getByUsername, {
    username,
  });
  const status = useQuery(api.instagramSources.getStatus, { username });
  const events = useQuery(api.instagramSources.getEventsForSource, {
    username,
  });

  const ensureSource = useMutation(api.instagramSources.ensureSource);
  const trackMutation = useMutation(api.instagramSources.track);
  const untrackMutation = useMutation(api.instagramSources.untrack);

  // Auto-track: create source on first visit if it doesn't exist
  useEffect(() => {
    if (sourceInfo && !sourceInfo.exists) {
      void ensureSource({ username });
    }
  }, [sourceInfo, username, ensureSource]);

  const isTracked = sourceInfo?.exists ? sourceInfo.isTracked : false;

  const handleFollowToggle = async () => {
    if (isTracked) {
      await untrackMutation({ username });
    } else {
      await trackMutation({ username });
    }
  };

  return (
    <div>
      <ProfileLinkCard username={username} />

      {/* Follow/Unfollow button */}
      <div className="mt-4">
        <Button
          onClick={handleFollowToggle}
          variant={isTracked ? "destructive" : "default"}
        >
          {isTracked ? "Unfollow" : "Follow"}
        </Button>
        {status && (
          <span className="ml-3 text-sm text-neutral-2">
            {status.followerCount}{" "}
            {status.followerCount === 1 ? "follower" : "followers"} &middot;{" "}
            {status.eventsFound} events found &middot; Last checked:{" "}
            {formatTimeAgo(status.lastCheckedAt)}
          </span>
        )}
      </div>

      {/* Events */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-1">Events</h2>
        {events === undefined ? (
          <p className="mt-4 text-neutral-2">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="mt-4 text-neutral-2">
            We&apos;re scanning recent posts &mdash; events will appear here
            soon.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {events.map((event) => (
              <EventListItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
