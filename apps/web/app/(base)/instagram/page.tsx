"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { Instagram } from "lucide-react";

import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";
import { Card } from "@soonlist/ui/card";
import { Input } from "@soonlist/ui/input";

export default function InstagramPage() {
  const { isSignedIn } = useUser();
  const [username, setUsername] = useState("");

  const sources = useQuery(
    api.instagramSources.listForUser,
    isSignedIn ? {} : "skip",
  );
  const trackMutation = useMutation(api.instagramSources.track);
  const untrackMutation = useMutation(api.instagramSources.untrack);

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Instagram className="size-12 text-neutral-2" />
        <h1 className="text-2xl font-bold">Instagram Events</h1>
        <p className="text-neutral-2">
          Please sign in to follow Instagram accounts.
        </p>
      </div>
    );
  }

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    await trackMutation({ username: username.trim() });
    setUsername("");
  };

  const handleUntrack = async (sourceUsername: string) => {
    await untrackMutation({ username: sourceUsername });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Instagram Events</h1>
        <p className="text-neutral-2">
          Follow Instagram accounts that post events. We&apos;ll automatically
          add new events to your feed.
        </p>
      </div>

      {/* Followed sources */}
      {sources && sources.length > 0 && (
        <div className="flex flex-col gap-3">
          {sources.map(({ source }) => (
            <Card key={source._id} className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <Link
                  href={`/instagram/${source.username}`}
                  className="flex items-center gap-2 font-semibold text-interactive-1 hover:underline"
                >
                  <Instagram className="size-4" />@{source.username}
                </Link>
                <span className="text-xs text-green-600">Following</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-2">
                <span>
                  {source.followerCount}{" "}
                  {source.followerCount === 1 ? "follower" : "followers"}
                </span>
                <span>·</span>
                <span>{source.eventsFound} events found</span>
                {source.lastCheckedAt && (
                  <>
                    <span>·</span>
                    <span>
                      Last checked: {formatTimeAgo(source.lastCheckedAt)}
                    </span>
                  </>
                )}
              </div>
              {source.status === "error" && source.errorMessage && (
                <p className="text-xs text-red-500">
                  Error: {source.errorMessage}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-1 w-fit"
                onClick={() => handleUntrack(source.username)}
              >
                Unfollow
              </Button>
            </Card>
          ))}
        </div>
      )}

      {sources?.length === 0 && (
        <p className="text-sm text-neutral-2">
          You&apos;re not following any Instagram accounts yet.
        </p>
      )}

      {/* Add new source */}
      <Card className="p-4">
        <form onSubmit={handleTrack} className="flex flex-col gap-3">
          <h2 className="font-semibold">Follow an Instagram account</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-2">
                @
              </span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="pl-7"
              />
            </div>
            <Button type="submit" disabled={!username.trim()}>
              Follow Events
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
