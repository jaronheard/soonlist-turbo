"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";

import { buildDefaultUrl } from "~/components/ImageUpload";
import { useWorkflowStore } from "~/hooks/useWorkflowStore";
import { optimizeImageToBase64 } from "~/lib/imageOptimization";

export function EventsFromImage({
  filePath,
  timezone,
}: {
  filePath: string;
  timezone: string;
}) {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const { addWorkflowId } = useWorkflowStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasStartedRef = useRef(false);

  const createEventFromImage = useMutation(
    api.ai.eventFromImageBase64ThenCreate,
  );

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
      // Convert image URL to optimized base64 (resize to 640px width, 50% quality, WebP)
      const imageUrl = buildDefaultUrl(filePath);
      let base64Image: string;

      try {
        // Try to optimize the image
        base64Image = await optimizeImageToBase64(imageUrl, 640, 0.5);
      } catch (optimizeError) {
        console.warn(
          "Failed to optimize image, using fallback:",
          optimizeError,
        );
        // Fallback to simple conversion without optimization
        const { imageUrlToBase64 } = await import("~/lib/imageOptimization");
        base64Image = await imageUrlToBase64(imageUrl);
      }

      const result = await createEventFromImage({
        base64Image,
        timezone,
        userId: currentUser.id,
        username: currentUser.username || currentUser.id,
        sendNotification: false, // Web doesn't have push notifications
        visibility: "public",
        lists: [],
      });

      if (result.workflowId) {
        addWorkflowId(result.workflowId);
        // Navigate directly to upcoming page without toast
        router.push(`/${currentUser.username || currentUser.id}/upcoming`);
      }
    } catch (err) {
      console.error("Error creating event from image:", err);
      setError(err instanceof Error ? err.message : "Failed to create event");
      toast.error("Failed to upload image");
      // Reset the ref on error so user can retry
      hasStartedRef.current = false;
    } finally {
      setIsProcessing(false);
    }
  }, [
    currentUser,
    filePath,
    timezone,
    createEventFromImage,
    addWorkflowId,
    router,
  ]);

  // Automatically process the image when component mounts
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={buildDefaultUrl(filePath)}
            alt="Event preview"
            className="mb-4 max-h-64 w-full rounded-md object-contain"
          />

          {isProcessing && (
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Extracting event details from image...</span>
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