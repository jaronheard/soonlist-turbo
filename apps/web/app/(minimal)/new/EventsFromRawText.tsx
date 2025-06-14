"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useWorkflowStore } from "~/hooks/useWorkflowStore";

export function EventsFromRawText({
  rawText,
  timezone,
}: {
  rawText: string;
  timezone: string;
}) {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const { addWorkflowId } = useWorkflowStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasStartedRef = useRef(false);

  const createEventFromText = useMutation(api.ai.eventFromTextThenCreate);

  const handleCreateEvent = useCallback(async () => {
    // Prevent duplicate processing
    if (hasStartedRef.current) {
      console.log("Event processing already started, skipping duplicate call");
      return;
    }

    if (!currentUser) {
      toast.error("Please sign in to create events");
      return;
    }

    hasStartedRef.current = true;
    setIsProcessing(true);
    setError(null);

    try {
      const result = await createEventFromText({
        rawText,
        timezone,
        userId: currentUser.id,
        username: currentUser.username || currentUser.id,
        sendNotification: false, // Web doesn't have push notifications
        visibility: "public",
        lists: [],
      });

      if (result.workflowId) {
        addWorkflowId(result.workflowId);
        // Navigate directly to upcoming page without extra toast
        router.push(`/${currentUser.username || currentUser.id}/upcoming`);
      }
    } catch (err) {
      console.error("Error creating event from text:", err);
      setError(err instanceof Error ? err.message : "Failed to create event");
      toast.error("Failed to process text");
      // Reset the ref on error so user can retry
      hasStartedRef.current = false;
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser, rawText, timezone, createEventFromText, addWorkflowId, router]);

  // Automatically process the text when component mounts
  useEffect(() => {
    if (!isProcessing && !error && !hasStartedRef.current) {
      void handleCreateEvent();
    }
  }, [isProcessing, error, handleCreateEvent]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-2 text-lg font-semibold">Processing Event</h3>
          <p className="mb-4 whitespace-pre-wrap text-sm text-muted-foreground">
            {rawText.length > 200 ? rawText.substring(0, 200) + "..." : rawText}
          </p>

          {isProcessing && (
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Extracting event details from text...</span>
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
