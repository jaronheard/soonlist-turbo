"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { blankEvent } from "@soonlist/cal";
import { api } from "@soonlist/backend/convex/_generated/api";

import { AddToCalendarCard } from "~/components/AddToCalendarCard";
import { useWorkflowStore } from "~/hooks/useWorkflowStore";
import { EventPreviewLoadingSpinner } from "./EventPreviewLoadingSpinner";
import { EventsError } from "./EventsError";
import { NewEventPreview } from "./NewEventPreview";


export function EventsFromRawText({
  rawText,
  timezone,
}: {
  rawText: string;
  timezone: string;
}) {
  const router = useRouter();
  const { user } = useUser();
  const { addWorkflowId } = useWorkflowStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEventFromText = useMutation(api.ai.eventFromTextThenCreate);

  const handleCreateEvent = async () => {
    if (!user) {
      toast.error("Please sign in to create events");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const workflowId = await createEventFromText({
        text: rawText,
        timezone,
        userId: user.id,
        username: user.username || user.id,
        sendPushNotification: false, // Web doesn't have push notifications
        visibility: "public",
        lists: [],
      });

      if (workflowId) {
        addWorkflowId(workflowId);
        toast.success("Processing event from text...");
        router.push("/"); // Navigate to home while processing
      }
    } catch (err) {
      console.error("Error creating event from text:", err);
      setError(err instanceof Error ? err.message : "Failed to create event");
      toast.error("Failed to process text");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-2 text-lg font-semibold">Create Event from Text</h3>
        <p className="mb-4 whitespace-pre-wrap text-sm text-muted-foreground">
          {rawText}
        </p>
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
          {isProcessing ? "Processing..." : "Create Event from Text"}
        </button>
      </div>
      
      {/* Show blank event card as preview */}
      <AddToCalendarCard {...blankEvent} hideFloatingActionButtons />
    </div>
  );
}
