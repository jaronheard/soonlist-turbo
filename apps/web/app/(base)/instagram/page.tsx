"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Instagram } from "lucide-react";

import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";
import { Input } from "@soonlist/ui/input";

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

function SourceCard({
  source,
}: {
  source: {
    username: string;
    listId: string;
    status: string;
    lastCheckedAt?: number;
    followerCount: number;
    eventsFound: number;
    listName: string;
  };
}) {
  const untrack = useMutation(api.instagramSources.untrack);
  const [isUntracking, setIsUntracking] = useState(false);

  const handleUntrack = async () => {
    setIsUntracking(true);
    try {
      await untrack({ username: source.username });
    } finally {
      setIsUntracking(false);
    }
  };

  return (
    <div className="rounded-lg border border-neutral-3 p-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/instagram/${source.username}`}
          className="flex items-center gap-2 text-lg font-semibold text-interactive-1 hover:underline"
        >
          <Instagram className="size-5" />@{source.username}
        </Link>
        <span className="text-accent-1 text-sm">Following</span>
      </div>
      <div className="mt-2 text-sm text-neutral-2">
        {source.followerCount}{" "}
        {source.followerCount === 1 ? "follower" : "followers"} &middot;{" "}
        {source.eventsFound} {source.eventsFound === 1 ? "event" : "events"}{" "}
        found
      </div>
      <div className="mt-1 text-sm text-neutral-2">
        Last checked: {formatTimeAgo(source.lastCheckedAt)}
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="mt-3"
        onClick={handleUntrack}
        disabled={isUntracking}
      >
        {isUntracking ? "Unfollowing..." : "Unfollow"}
      </Button>
    </div>
  );
}

export default function InstagramPage() {
  const sources = useQuery(api.instagramSources.listForUser);
  const track = useMutation(api.instagramSources.track);
  const [usernameInput, setUsernameInput] = useState("");
  const [isTracking, setIsTracking] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    setIsTracking(true);
    try {
      await track({ username: usernameInput.trim() });
      setUsernameInput("");
    } finally {
      setIsTracking(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-1">Instagram Events</h1>
      <p className="mt-2 text-neutral-2">
        Follow Instagram accounts that post events. We&apos;ll automatically add
        new events to your feed.
      </p>

      {/* Tracked sources list */}
      <div className="mt-8 space-y-4">
        {sources === undefined ? (
          <div className="text-neutral-2">Loading...</div>
        ) : sources.length === 0 ? (
          <div className="text-neutral-2">
            You&apos;re not following any Instagram accounts yet.
          </div>
        ) : (
          sources.map((source) => (
            <SourceCard key={source.username} source={source} />
          ))
        )}
      </div>

      {/* Follow new account */}
      <div className="mt-8 rounded-lg border border-neutral-3 p-4">
        <h2 className="text-lg font-semibold text-neutral-1">
          Follow an Instagram account
        </h2>
        <form onSubmit={handleTrack} className="mt-3 flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2">
            <span className="text-neutral-2">@</span>
            <Input
              type="text"
              placeholder="username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="flex-1"
            />
          </div>
          <Button type="submit" disabled={isTracking || !usernameInput.trim()}>
            {isTracking ? "Following..." : "Follow Events"}
          </Button>
        </form>
      </div>
    </div>
  );
}
