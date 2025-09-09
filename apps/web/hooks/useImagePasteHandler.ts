"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { TimezoneContext } from "~/context/TimezoneContext";
import { useWorkflowStore } from "~/hooks/useWorkflowStore";
import { optimizeFileToBase64 } from "~/lib/imageOptimization";
import {
  extractImagesFromClipboard,
  getNavigationPath,
  getPageContext,
  isValidImageFile,
  shouldHandlePasteEvent,
} from "~/lib/pasteEventUtils";

interface UseImagePasteHandlerOptions {
  enabled?: boolean;
  onSuccess?: (workflowId: string) => void;
  onError?: (error: Error) => void;
}

interface UseImagePasteHandlerReturn {
  isProcessing: boolean;
  error: string | null;
  lastProcessedImage: string | null;
}

export function useImagePasteHandler(
  options: UseImagePasteHandlerOptions = {},
): UseImagePasteHandlerReturn {
  const { enabled = true, onSuccess, onError } = options;
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useQuery(api.users.getCurrentUser);
  const { timezone } = useContext(TimezoneContext);
  const { addWorkflowId } = useWorkflowStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProcessedImage, setLastProcessedImage] = useState<string | null>(
    null,
  );

  // Synchronous ref lock to prevent duplicate event creation on rapid paste
  const isProcessingRef = useRef<boolean>(false);

  const createEventFromImage = useMutation(
    api.ai.eventFromImageBase64ThenCreate,
  );

  // Helper function to check if paste event should be handled
  const shouldHandlePasteEventInternal = useCallback(
    (event: ClipboardEvent): boolean => {
      // Don't handle if not enabled
      if (!enabled) return false;

      // Don't handle if user is not authenticated
      if (!currentUser) return false;

      // Don't handle if currently processing (check both state and ref for atomicity)
      if (isProcessing || isProcessingRef.current) return false;

      // Use utility function for event filtering
      return shouldHandlePasteEvent(event);
    },
    [enabled, currentUser, isProcessing, isProcessingRef],
  );

  // Main paste handler function
  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      // Set synchronous ref lock immediately to prevent re-entry
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        // Check if we should handle this paste event
        if (!shouldHandlePasteEventInternal(event)) return;

        // Extract images from clipboard
        const clipboardData = event.clipboardData;
        if (!clipboardData) return;

        const images = extractImagesFromClipboard(clipboardData);
        if (images.length === 0) return;

        // Validate the first image
        const image = images[0];
        if (!image || !currentUser) return;

        if (!isValidImageFile(image)) {
          setError("Unsupported image format");
          return;
        }

        // Prevent default paste behavior for images
        event.preventDefault();

        setIsProcessing(true);
        setError(null);

        // Convert image to base64
        const base64Image = await optimizeFileToBase64(image, 640, 0.5);
        setLastProcessedImage(base64Image);

        // Create event from image
        const result = await createEventFromImage({
          base64Image,
          timezone,
          userId: currentUser.id,
          username: currentUser.username || currentUser.id,
          sendNotification: false,
          visibility: "public",
          lists: [],
        });

        if (result.workflowId) {
          addWorkflowId(result.workflowId);
          onSuccess?.(result.workflowId);

          // Navigate based on page context
          const pageContext = getPageContext(pathname);
          const navigationPath = getNavigationPath(
            pageContext,
            pathname,
            currentUser.username || currentUser.id,
          );
          router.push(navigationPath);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to process image";
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        console.error("Error processing pasted image:", err);
      } finally {
        // Always clear both the ref lock and state, even on errors
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [
      shouldHandlePasteEventInternal,
      currentUser,
      timezone,
      createEventFromImage,
      addWorkflowId,
      onSuccess,
      onError,
      router,
      pathname,
    ],
  );

  // Set up global paste event listener
  useEffect(() => {
    if (!enabled) return;

    const pasteListener = (event: ClipboardEvent) => {
      void handlePaste(event);
    };

    document.addEventListener("paste", pasteListener);

    return () => {
      document.removeEventListener("paste", pasteListener);
    };
  }, [enabled, handlePaste]);

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    isProcessing,
    error,
    lastProcessedImage,
  };
}
