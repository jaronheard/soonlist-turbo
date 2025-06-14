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

  // Automatically process the text when component mounts and navigate immediately
  useEffect(() => {
    if (!isProcessing && !error && !hasStartedRef.current && currentUser) {
      void handleCreateEvent();
      // Navigate immediately to upcoming page
      router.push(`/${currentUser.username || currentUser.id}/upcoming`);
    }
  }, [isProcessing, error, handleCreateEvent, currentUser, router]);

  // This component immediately navigates away, so we don't render anything
  return null;
}
