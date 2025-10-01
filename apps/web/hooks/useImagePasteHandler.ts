"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { TimezoneContext } from "~/context/TimezoneContext";
import {
  generateBatchId,
  generateTempId,
  validateImageCount,
} from "~/lib/batchUtils";
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


  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProcessedImage, setLastProcessedImage] = useState<string | null>(
    null,
  );

  // Synchronous ref lock to prevent duplicate event creation on rapid paste
  const isProcessingRef = useRef(false);

  const createEventBatch = useMutation(api.ai.createEventBatch);

  // Helper function to check if paste event should be handled
  const shouldHandlePasteEventInternal = useCallback(
    (event: ClipboardEvent): boolean => {
      // Don't handle if not enabled
      if (!enabled) return false;

      // Don't handle if user is not authenticated
      if (!currentUser) return false;

      // Don't handle if currently processing (state check only - ref lock handled separately)
      if (isProcessing) return false;

      // Use utility function for event filtering
      return shouldHandlePasteEvent(event);
    },
    [enabled, currentUser, isProcessing],
  );

  // Main paste handler function
  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      try {
        // Check if we should handle this paste event
        if (!shouldHandlePasteEventInternal(event)) return;

        // Atomic lock check and set - prevents race conditions on rapid paste
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        // Extract images from clipboard
        const clipboardData = event.clipboardData;
        if (!clipboardData) {
          isProcessingRef.current = false;
          return;
        }

        const images = extractImagesFromClipboard(clipboardData);
        if (images.length === 0) {
          isProcessingRef.current = false;
          return;
        }

        if (!currentUser) {
          isProcessingRef.current = false;
          return;
        }

        // Validate image count
        const validation = validateImageCount(images.length);
        if (!validation.valid) {
          setError(validation.error ?? "Invalid image count");
          isProcessingRef.current = false;
          onError?.(new Error(validation.error ?? "Invalid image count"));
          return;
        }

        // Validate all images
        const invalidImages = images.filter((img) => !isValidImageFile(img));
        if (invalidImages.length > 0) {
          setError(`${invalidImages.length} image(s) have unsupported format`);
          isProcessingRef.current = false;
          return;
        }

        // Prevent default paste behavior for images
        event.preventDefault();

        setIsProcessing(true);
        setError(null);

        // Convert all images to base64 and create batch
        const batchId = generateBatchId();
        const batchImages = await Promise.all(
          images.map(async (image) => {
            const base64Image = await optimizeFileToBase64(image, 640, 0.5);
            return {
              base64Image,
              tempId: generateTempId(),
            };
          }),
        );

        // Store the last processed image (for backward compatibility)
        if (batchImages.length > 0 && batchImages[0]) {
          setLastProcessedImage(batchImages[0].base64Image);
        }

        // Create batch of events from images
        const result = await createEventBatch({
          batchId,
          images: batchImages,
          timezone,
          userId: currentUser.id,
          username: currentUser.username || currentUser.id,
          sendNotification: false,
          visibility: "public",
          lists: [],
        });

        if (result.batchId) {
          // For multi-image batches, we don't get a single workflowId
          // The backend processes them asynchronously
          onSuccess?.(result.batchId);

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
          err instanceof Error ? err.message : "Failed to process images";
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        console.error("Error processing pasted images:", err);
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
      createEventBatch,
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
