"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { TimezoneContext } from "~/context/TimezoneContext";
import {
  generateBatchId,
  generateTempId,
  MAX_BATCH_SIZE,
  validateImageCount,
} from "~/lib/batchUtils";
import { optimizeFileToBase64 } from "~/lib/imageOptimization";
import {
  extractImagesFromDataTransfer,
  getNavigationPath,
  getPageContext,
  hasImageFiles,
  isValidImageFile,
} from "~/lib/pasteEventUtils";

interface UseDragAndDropHandlerOptions {
  enabled?: boolean;
  onSuccess?: (batchId: string) => void;
  onError?: (error: Error) => void;
}

interface UseDragAndDropHandlerReturn {
  isDragging: boolean;
  isProcessing: boolean;
  error: string | null;
  lastProcessedImage: string | null;
  imageCount: number; // Number of images being dragged
  currentBatchId: string | null; // Current batch being processed
  hasValidationError: boolean; // True if dragging too many images
}

export function useDragAndDropHandler(
  options: UseDragAndDropHandlerOptions = {},
): UseDragAndDropHandlerReturn {
  const { enabled = true, onSuccess, onError } = options;
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useQuery(api.users.getCurrentUser);
  const { timezone } = useContext(TimezoneContext);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProcessedImage, setLastProcessedImage] = useState<string | null>(
    null,
  );
  const [imageCount, setImageCount] = useState(0);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [hasValidationError, setHasValidationError] = useState(false);

  // Counter to track drag enter/leave for nested elements
  const dragCounterRef = useRef(0);

  // Synchronous ref lock to prevent duplicate event creation
  const isProcessingRef = useRef(false);

  const createEventBatch = useMutation(api.ai.createEventBatch);

  // Handle drag enter
  const handleDragEnter = useCallback(
    (event: DragEvent) => {
      if (!enabled || !currentUser) return;

      event.preventDefault();
      event.stopPropagation();

      dragCounterRef.current += 1;

      // Only set dragging state if we have image files
      if (event.dataTransfer && hasImageFiles(event.dataTransfer)) {
        if (dragCounterRef.current === 1) {
          setIsDragging(true);
          // Try to get the count of images being dragged
          const items = event.dataTransfer.items;
          if (items) {
            let count = 0;
            for (const item of items) {
              if (item?.type.startsWith("image/")) {
                count++;
              }
            }
            setImageCount(count);

            // Validate image count immediately
            if (count > MAX_BATCH_SIZE) {
              setHasValidationError(true);
            } else {
              setHasValidationError(false);
            }
          }
        }
      }
    },
    [enabled, currentUser],
  );

  // Handle drag over
  const handleDragOver = useCallback(
    (event: DragEvent) => {
      if (!enabled || !currentUser) return;

      event.preventDefault();
      event.stopPropagation();

      // Set dropEffect to indicate this is a valid drop zone
      if (event.dataTransfer && hasImageFiles(event.dataTransfer)) {
        event.dataTransfer.dropEffect = "copy";
      }
    },
    [enabled, currentUser],
  );

  // Handle drag leave
  const handleDragLeave = useCallback(
    (event: DragEvent) => {
      if (!enabled || !currentUser) return;

      event.preventDefault();
      event.stopPropagation();

      dragCounterRef.current -= 1;

      if (dragCounterRef.current === 0) {
        setIsDragging(false);
        setImageCount(0);
        setHasValidationError(false);
      }
    },
    [enabled, currentUser],
  );

  // Handle drop
  const handleDrop = useCallback(
    async (event: DragEvent) => {
      if (!enabled || !currentUser) return;

      event.preventDefault();
      event.stopPropagation();

      // Reset drag state
      dragCounterRef.current = 0;
      setIsDragging(false);
      setImageCount(0);

      // Atomic lock check-and-set - use only ref for lock
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      setIsProcessing(true);

      try {
        // Extract images from drop
        const dataTransfer = event.dataTransfer;
        if (!dataTransfer) {
          isProcessingRef.current = false;
          setIsProcessing(false);
          return;
        }

        const images = extractImagesFromDataTransfer(dataTransfer);
        if (images.length === 0) {
          isProcessingRef.current = false;
          setIsProcessing(false);
          return;
        }

        // Validate image count
        const validation = validateImageCount(images.length);
        if (!validation.valid) {
          setError(validation.error ?? "Invalid image count");
          isProcessingRef.current = false;
          setIsProcessing(false);
          onError?.(new Error(validation.error ?? "Invalid image count"));
          return;
        }

        // Validate all images
        const invalidImages = images.filter((img) => !isValidImageFile(img));
        if (invalidImages.length > 0) {
          setError(`${invalidImages.length} image(s) have unsupported format`);
          isProcessingRef.current = false;
          setIsProcessing(false);
          return;
        }
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
          // Store the batchId for progress tracking
          setCurrentBatchId(result.batchId);

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
        console.error("Error processing dropped images:", err);
      } finally {
        // Always clear both the ref lock and state
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [
      enabled,
      currentUser,
      timezone,
      createEventBatch,
      onSuccess,
      onError,
      router,
      pathname,
    ],
  );

  // Set up global drag and drop event listeners
  useEffect(() => {
    if (!enabled) return;

    const dragEnterListener = (event: DragEvent) => {
      handleDragEnter(event);
    };

    const dragOverListener = (event: DragEvent) => {
      handleDragOver(event);
    };

    const dragLeaveListener = (event: DragEvent) => {
      handleDragLeave(event);
    };

    const dropListener = (event: DragEvent) => {
      void handleDrop(event);
    };

    document.addEventListener("dragenter", dragEnterListener as EventListener);
    document.addEventListener("dragover", dragOverListener as EventListener);
    document.addEventListener("dragleave", dragLeaveListener as EventListener);
    document.addEventListener("drop", dropListener as EventListener);

    return () => {
      document.removeEventListener(
        "dragenter",
        dragEnterListener as EventListener,
      );
      document.removeEventListener(
        "dragover",
        dragOverListener as EventListener,
      );
      document.removeEventListener(
        "dragleave",
        dragLeaveListener as EventListener,
      );
      document.removeEventListener("drop", dropListener as EventListener);
    };
  }, [enabled, handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    isDragging,
    isProcessing,
    error,
    lastProcessedImage,
    imageCount,
    currentBatchId,
    hasValidationError,
  };
}
