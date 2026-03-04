"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { ExternalLink, Instagram } from "lucide-react";

import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";
import { Card } from "@soonlist/ui/card";

export default function InstagramUsernamePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const { isSignedIn } = useUser();

  const sourceInfo = useQuery(
    api.instagramSources.getByUsername,
    isSignedIn ? { username } : "skip",
  );

  const events = useQuery(
    api.instagramSources.getEventsForSource,
    isSignedIn ? { username } : "skip",
  );

  const ensureSourceMutation = useMutation(api.instagramSources.ensureSource);
  const trackMutation = useMutation(api.instagramSources.track);
  const untrackMutation = useMutation(api.instagramSources.untrack);

  // Auto-track: create source on first visit if it doesn't exist
  useEffect(() => {
    if (isSignedIn && sourceInfo && !sourceInfo.found) {
      void ensureSourceMutation({ username });
    }
  }, [isSignedIn, sourceInfo, username, ensureSourceMutation]);

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Instagram className="size-12 text-neutral-2" />
        <h1 className="text-2xl font-bold">@{username}</h1>
        <p className="text-neutral-2">
          Please sign in to view Instagram events.
        </p>
      </div>
    );
  }

  const isFollowing = sourceInfo?.found ? sourceInfo.isFollowing : false;

  const handleFollow = async () => {
    await trackMutation({ username });
  };

  const handleUnfollow = async () => {
    await untrackMutation({ username });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Profile Link Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Instagram className="size-8 text-neutral-1" />
            <div>
              <h1 className="text-xl font-bold">@{username}</h1>
              <Link
                href={`https://instagram.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-interactive-1 hover:underline"
              >
                View on Instagram
                <ExternalLink className="size-3" />
              </Link>
            </div>
          </div>
          <Button
            variant={isFollowing ? "outline" : "default"}
            onClick={isFollowing ? handleUnfollow : handleFollow}
          >
            {isFollowing ? "Unfollow" : "Follow"}
          </Button>
        </div>
        {sourceInfo?.found && (
          <div className="mt-3 flex items-center gap-3 text-xs text-neutral-2">
            <span>
              {sourceInfo.source.followerCount}{" "}
              {sourceInfo.source.followerCount === 1 ? "follower" : "followers"}
            </span>
            <span>·</span>
            <span>{sourceInfo.source.eventsFound} events found</span>
            {sourceInfo.source.status === "error" && (
              <>
                <span>·</span>
                <span className="text-red-500">Error checking</span>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Events */}
      {events === undefined ? (
        <p className="text-sm text-neutral-2">Loading events...</p>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-neutral-2">
            We&apos;re scanning recent posts — events will appear here soon.
          </p>
          <p className="text-xs text-neutral-3">
            New events are checked every few hours.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold">Events ({events.length})</h2>
          {events.map((event) => (
            <Card key={event._id} className="p-4">
              <Link
                href={`/event/${event.id}`}
                className="flex flex-col gap-1 hover:opacity-80"
              >
                <h3 className="font-semibold text-neutral-1">{event.name}</h3>
                <p className="text-sm text-neutral-2">
                  {event.startDate}
                  {event.startTime && ` at ${event.startTime}`}
                </p>
                {event.location && (
                  <p className="text-sm text-neutral-2">{event.location}</p>
                )}
                {event.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-3">
                    {event.description}
                  </p>
                )}
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
