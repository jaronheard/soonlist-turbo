"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
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
  const { user } = useUser();
  const { addWorkflowId } = useWorkflowStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEventFromText = useMutation(api.ai.eventFromTextThenCreate);

  const handleCreateEvent = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to create events");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await createEventFromText({
        rawText,
        timezone,
        userId: user.id,
        username: user.username || user.id,
        sendNotification: false, // Web doesn't have push notifications
        visibility: "public",
        lists: [],
      });

      if (result.workflowId) {
        addWorkflowId(result.workflowId);
        toast.success("Processing event from text...");
        router.push(`/${user.username || user.id}/upcoming`); // Navigate to user's upcoming page while processing
      }
    } catch (err) {
      console.error("Error creating event from text:", err);
      setError(err instanceof Error ? err.message : "Failed to create event");
      toast.error("Failed to process text");
    } finally {
      setIsProcessing(false);
    }
  }, [user, rawText, timezone, createEventFromText, addWorkflowId, router]);

  // Automatically process when component mounts
  useEffect(() => {
    void handleCreateEvent();
  }, [handleCreateEvent]);

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
