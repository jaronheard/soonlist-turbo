"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useWorkflowStore } from "~/hooks/useWorkflowStore";

export function EventsFromUrl({
  url,
  timezone,
}: {
  url: string;
  timezone: string;
}) {
  const router = useRouter();
  const { user } = useUser();
  const { addWorkflowId } = useWorkflowStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEventFromUrl = useMutation(api.ai.eventFromUrlThenCreate);

  const handleCreateEvent = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to create events");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await createEventFromUrl({
        url,
        timezone,
        userId: user.id,
        username: user.username || user.id,
        sendNotification: false, // Web doesn't have push notifications
        visibility: "public",
        lists: [],
      });

      if (result.workflowId) {
        addWorkflowId(result.workflowId);
        toast.success("Processing event from URL...");
        router.push("/"); // Navigate to home while processing
      }
    } catch (err) {
      console.error("Error creating event from URL:", err);
      setError(err instanceof Error ? err.message : "Failed to create event");
      toast.error("Failed to process URL");
    } finally {
      setIsProcessing(false);
    }
  }, [user, url, timezone, createEventFromUrl, addWorkflowId, router]);

  // Automatically process when component mounts
  useEffect(() => {
    void handleCreateEvent();
  }, [handleCreateEvent]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-2 text-lg font-semibold">Processing Event</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            URL: {url.length > 50 ? url.substring(0, 50) + "..." : url}
          </p>
          
          {isProcessing && (
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Extracting event details from URL...</span>
            </div>
          )}
          
          {error && (
            <div className="space-y-2">
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
              <button
                onClick={handleCreateEvent}
                className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
