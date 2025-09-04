/**
 * Custom hook for handling image paste events to create events
 * Integrates with existing event creation workflow
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";

import type { PasteImageError } from "~/lib/imagePaste";
import { useWorkflowStore } from "~/hooks/useWorkflowStore";
import { DEFAULT_TIMEZONE } from "~/lib/constants";
import {
  extractImageFromClipboard,
  shouldPreventPasteHandling,
} from "~/lib/imagePaste";

export interface UsePasteImageHandlerOptions {
  /** Whether to enable the paste handler */
  enabled?: boolean;
  /** Timezone for event creation */
  timezone?: string;
  /** Whether to show toast notifications */
  showToasts?: boolean;
  /** Custom success callback */
  onSuccess?: (eventId: string) => void;
  /** Custom error callback */
  onError?: (error: PasteImageError) => void;
}

export interface PasteImageHandlerState {
  isProcessing: boolean;
  error: string | null;
  lastProcessedImage: string | null;
}

/**
 * Hook that handles image paste events and creates events from pasted images
 */
export function usePasteImageHandler(
  options: UsePasteImageHandlerOptions = {},
) {
  const {
    enabled = true,
    timezone = DEFAULT_TIMEZONE,
    showToasts = true,
    onSuccess,
    onError,
  } = options;

  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const { addWorkflowId } = useWorkflowStore();

  const [state, setState] = useState<PasteImageHandlerState>({
    isProcessing: false,
    error: null,
    lastProcessedImage: null,
  });

  // Track if we're currently processing to prevent duplicate requests
  const processingRef = useRef(false);

  const createEventFromImage = useMutation(
    api.ai.eventFromImageBase64ThenCreate,
  );

  const handlePasteEvent = useCallback(
    async (event: ClipboardEvent) => {
      // Skip if disabled or already processing
      if (!enabled || processingRef.current) {
        return;
      }

      // Skip if user is typing in an input field
      if (shouldPreventPasteHandling()) {
        return;
      }

      // Skip if user is not authenticated
      if (!currentUser) {
        if (showToasts) {
          toast.error("Please sign in to create events from images");
        }
        return;
      }

      // Prevent default paste behavior for images
      event.preventDefault();

      processingRef.current = true;
      setState((prev) => ({
        ...prev,
        isProcessing: true,
        error: null,
      }));

      try {
        // Extract and process image from clipboard
        const { base64Image, originalSize, optimizedSize } =
          await extractImageFromClipboard(event);

        if (showToasts) {
          toast.loading("Creating event from image...", {
            id: "paste-image-processing",
          });
        }

        console.log(
          `Processing pasted image: ${Math.round(originalSize / 1024)}KB -> ${Math.round(optimizedSize / 1024)}KB`,
        );

        // Create event using the same API as the existing flow
        const result = await createEventFromImage({
          base64Image,
          timezone,
          userId: currentUser.id,
          username: currentUser.username || currentUser.id,
          sendNotification: false, // Web doesn't have push notifications
          visibility: "public",
          lists: [],
        });

        setState((prev) => ({
          ...prev,
          isProcessing: false,
          lastProcessedImage: base64Image.substring(0, 50) + "...", // Store truncated version for debugging
        }));

        if (result.workflowId) {
          addWorkflowId(result.workflowId);

          if (showToasts) {
            toast.success("Event created from pasted image! 🎉", {
              id: "paste-image-processing",
            });
          }

          // Navigate to user's upcoming events
          // Note: onSuccess callback is not called since we only have workflowId, not eventId yet
          router.push(`/${currentUser.username || currentUser.id}/upcoming`);
        }
      } catch (error) {
        console.error("Error creating event from pasted image:", error);

        const pasteError: PasteImageError = error instanceof Error && 'type' in error
          ? error as PasteImageError
          : { type: "processing-error", message: error instanceof Error ? error.message : "Unknown error" };
        let errorMessage = "Failed to create event from image";

        // Provide user-friendly error messages based on error type
        switch (pasteError.type) {
          case "no-image":
            // Don't show error for no image - this is expected when pasting text
            setState((prev) => ({ ...prev, isProcessing: false }));
            processingRef.current = false;
            return;
          case "unsupported-format":
            errorMessage =
              "Unsupported image format. Please use JPEG, PNG, WebP, or GIF.";
            break;
          case "too-large":
            errorMessage = pasteError.message;
            break;
          case "processing-error":
            errorMessage = pasteError.message || "Failed to process image";
            break;
          default:
            errorMessage =
              pasteError.message || "Failed to create event from image";
        }

        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
        }));

        if (showToasts) {
          toast.error(errorMessage, {
            id: "paste-image-processing",
          });
        }

        // Call error callback if provided
        if (onError) {
          onError(pasteError);
        }
      } finally {
        processingRef.current = false;
      }
    },
    [
      enabled,
      currentUser,
      timezone,
      showToasts,
      createEventFromImage,
      addWorkflowId,
      router,
      onSuccess,
      onError,
    ],
  );

  // Set up paste event listener
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handlePaste = (event: ClipboardEvent) => {
      void handlePasteEvent(event);
    };

    // Add document-level paste listener
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [enabled, handlePasteEvent]);

  // Cleanup processing state on unmount
  useEffect(() => {
    return () => {
      processingRef.current = false;
    };
  }, []);

  return {
    ...state,
    isEnabled: enabled && !!currentUser,
    handlePasteEvent: enabled ? handlePasteEvent : undefined,
  };
}
