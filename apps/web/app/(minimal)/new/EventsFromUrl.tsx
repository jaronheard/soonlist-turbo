"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
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
  const currentUser = useQuery(api.users.getCurrentUser);
  const { addWorkflowId } = useWorkflowStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasStartedRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  const createEventFromUrl = useMutation(api.ai.eventFromUrlThenCreate);

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
      const result = await createEventFromUrl({
        url,
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
      console.error("Error creating event from URL:", err);
      setError(err instanceof Error ? err.message : "Failed to create event");
      toast.error("Failed to process URL");
      // Don't reset the ref - no retries needed
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser, url, timezone, createEventFromUrl, addWorkflowId, router]);

  // Navigate immediately on mount, only once
  useEffect(() => {
    if (currentUser && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      router.push(`/${currentUser.username || currentUser.id}/upcoming`);
    }
  }, [currentUser, router]);

  // Process the URL on mount, only once
  useEffect(() => {
    if (currentUser && !hasStartedRef.current) {
      void handleCreateEvent();
    }
  }, [currentUser]); // Remove handleCreateEvent from deps to prevent re-runs

  // This component immediately navigates away, so we don't render anything
  return null;
}
