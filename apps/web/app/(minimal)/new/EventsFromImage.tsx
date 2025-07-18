"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";

import { buildDefaultUrl } from "~/components/ImageUpload";
import { useWorkflowStore } from "~/hooks/useWorkflowStore";
import { optimizeImageToBase64 } from "~/lib/imageOptimization";

// Maximum base64 size to prevent journal overflow (900KB to be safe with 1MB limit)
const MAX_BASE64_SIZE = 900 * 1024;

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
      const imageUrl = buildDefaultUrl(filePath);
      let base64Image: string;

      // Optimize the image using jsquash/webp which works in Safari
      try {
        base64Image = await optimizeImageToBase64(imageUrl, 640, 0.5);
      } catch (optimizeError) {
        console.error("Failed to optimize image:", optimizeError);
        // If optimization fails, try to at least convert the image without resizing
        try {
          const { imageUrlToBase64 } = await import("~/lib/imageOptimization");
          base64Image = await imageUrlToBase64(imageUrl);
        } catch (fallbackError) {
          console.error("Fallback conversion also failed:", fallbackError);
          throw new Error(
            "Failed to process image. Please try a different image.",
          );
        }
      }

      // Validate base64 size
      const base64SizeBytes = base64Image.length;
      if (base64SizeBytes > MAX_BASE64_SIZE) {
        throw new Error(
          `Image too large after optimization: ${Math.round(base64SizeBytes / 1024)}KB (max ${Math.round(MAX_BASE64_SIZE / 1024)}KB). Please use a smaller image.`,
        );
      }

      console.log(
        `Sending base64 image of size: ${Math.round(base64SizeBytes / 1024)}KB`,
      );

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
      toast.error(
        err instanceof Error ? err.message : "Failed to upload image",
      );
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
