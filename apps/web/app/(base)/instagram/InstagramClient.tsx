"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Instagram,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { api } from "@soonlist/backend/convex/_generated/api";
import { Badge } from "@soonlist/ui/badge";
import { Button } from "@soonlist/ui/button";
import { Card } from "@soonlist/ui/card";
import { Input } from "@soonlist/ui/input";

export default function InstagramClient() {
  const sources = useQuery(api.instagramSources.listForUser) ?? [];
  const addSource = useMutation(api.instagramSources.add);
  const removeSource = useMutation(api.instagramSources.remove);
  const pauseSource = useMutation(api.instagramSources.pause);
  const resumeSource = useMutation(api.instagramSources.resume);
  const checkNow = useMutation(api.instagramSources.checkNow);

  const [username, setUsername] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsAdding(true);
    setError(null);

    try {
      await addSource({ instagramUsername: username.trim() });
      setUsername("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add Instagram source",
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (sourceId: (typeof sources)[0]["_id"]) => {
    setActionLoading(sourceId);
    try {
      await removeSource({ sourceId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove source");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseResume = async (source: (typeof sources)[0]) => {
    setActionLoading(source._id);
    try {
      if (source.status === "active") {
        await pauseSource({ sourceId: source._id });
      } else {
        await resumeSource({ sourceId: source._id });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update source");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckNow = async (sourceId: (typeof sources)[0]["_id"]) => {
    setActionLoading(`check-${sourceId}`);
    try {
      await checkNow({ sourceId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger check");
    } finally {
      setActionLoading(null);
    }
  };

  const formatTimeAgo = (timestamp: number | undefined) => {
    if (!timestamp) return "Never";
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Instagram className="size-6 text-interactive-1" />
          <h1 className="text-2xl font-bold text-interactive-1">
            Instagram Event Sources
          </h1>
        </div>
        <p className="mt-2 text-sm text-neutral-2">
          Track Instagram accounts that post events. Events are automatically
          captured and added to your feed.
        </p>
      </div>

      {/* Add source form */}
      <Card className="mb-6 p-4">
        <form onSubmit={handleAdd} className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-2">
              @
            </span>
            <Input
              type="text"
              placeholder="instagram_username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              className="pl-8"
              disabled={isAdding}
            />
          </div>
          <Button type="submit" disabled={isAdding || !username.trim()}>
            {isAdding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            <span className="ml-1.5">Track</span>
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </Card>

      {/* Sources list */}
      {sources.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-3 p-8 text-center">
          <Instagram className="mx-auto mb-3 size-10 text-neutral-3" />
          <p className="text-sm text-neutral-2">
            No Instagram sources yet. Add an account above to start tracking
            events.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <Card key={source._id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={source.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-interactive-1 hover:underline"
                    >
                      @{source.username}
                    </a>
                    <StatusBadge status={source.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-2">
                    <span>Checked: {formatTimeAgo(source.lastCheckedAt)}</span>
                    <span>{source.postsChecked} posts checked</span>
                    <span>{source.eventsFound} events found</span>
                  </div>
                  {source.errorMessage && (
                    <p className="mt-1 text-xs text-red-500">
                      {source.errorMessage}
                    </p>
                  )}
                </div>
                <div className="ml-3 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCheckNow(source._id)}
                    disabled={actionLoading === `check-${source._id}`}
                    title="Check now"
                  >
                    {actionLoading === `check-${source._id}` ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePauseResume(source)}
                    disabled={actionLoading === source._id}
                    title={source.status === "active" ? "Pause" : "Resume"}
                  >
                    {source.status === "active" ? (
                      <Pause className="size-4" />
                    ) : (
                      <Play className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(source._id)}
                    disabled={actionLoading === source._id}
                    title="Remove"
                    className="text-red-500 hover:text-red-600"
                  >
                    {actionLoading === source._id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Info section */}
      <div className="mt-8 rounded-lg bg-interactive-3 p-4">
        <h2 className="text-sm font-semibold text-interactive-1">
          How it works
        </h2>
        <ul className="mt-2 space-y-1.5 text-xs text-neutral-2">
          <li>
            Add an Instagram username to start tracking their event posts.
          </li>
          <li>
            Posts are checked every {sources[0]?.checkIntervalHours ?? 4} hours
            automatically.
          </li>
          <li>
            AI analyzes each post to identify events with dates, times, and
            locations.
          </li>
          <li>Detected events are added to your Soonlist as private events.</li>
          <li>Duplicate events are automatically detected and grouped.</li>
        </ul>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "paused" | "error" }) {
  switch (status) {
    case "active":
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Active
        </Badge>
      );
    case "paused":
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Paused
        </Badge>
      );
    case "error":
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-800">
          Error
        </Badge>
      );
  }
}
