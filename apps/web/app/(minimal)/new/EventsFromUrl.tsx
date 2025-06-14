"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";
import { blankEvent } from "@soonlist/cal";

import { AddToCalendarCard } from "~/components/AddToCalendarCard";
import { useWorkflowStore } from "~/hooks/useWorkflowStore";
import { EventPreviewLoadingSpinner } from "./EventPreviewLoadingSpinner";
import { EventsError } from "./EventsError";
import { NewEventPreview } from "./NewEventPreview";

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
  const hasStartedRef = useRef(false);

  const createEventFromUrl = useMutation(api.ai.eventFromUrlThenCreate);

  const handleCreateEvent = async () => {
    if (!user) {
      toast.error("Please sign in to create events");
      return;
    }

    // Prevent duplicate creation
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

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

      if (result?.workflowId) {
        addWorkflowId(result.workflowId);
        toast.success("Processing event from URL...");
        // Navigate to user's upcoming feed
        router.push(`/${user.username || user.id}/upcoming`);
      }
    } catch (err) {
      console.error("Error creating event from URL:", err);
      setError(err instanceof Error ? err.message : "Failed to create event");
      toast.error("Failed to process URL");
      // Reset on error to allow retry
      hasStartedRef.current = false;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-2 text-lg font-semibold">Create Event from URL</h3>
        <p className="mb-4 text-sm text-muted-foreground">URL: {url}</p>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <button
          onClick={handleCreateEvent}
          disabled={isProcessing}
          className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isProcessing ? "Processing..." : "Create Event from URL"}
        </button>
      </div>

      {/* Show blank event card as preview */}
      <AddToCalendarCard {...blankEvent} hideFloatingActionButtons />
    </div>
  );
}
