"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { TimezoneContext } from "~/context/TimezoneContext";
import { useWorkflowStore } from "~/hooks/useWorkflowStore";
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
  onSuccess?: (workflowId: string) => void;
  onError?: (error: Error) => void;
}

interface UseDragAndDropHandlerReturn {
  isDragging: boolean;
  isProcessing: boolean;
  error: string | null;
  lastProcessedImage: string | null;
}

export function useDragAndDropHandler(
  options: UseDragAndDropHandlerOptions = {},
): UseDragAndDropHandlerReturn {
  const { enabled = true, onSuccess, onError } = options;
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useQuery(api.users.getCurrentUser);
  const { timezone } = useContext(TimezoneContext);
  const { addWorkflowId } = useWorkflowStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProcessedImage, setLastProcessedImage] = useState<string | null>(
    null,
  );

  // Counter to track drag enter/leave for nested elements
  const dragCounterRef = useRef(0);

  // Synchronous ref lock to prevent duplicate event creation
  const isProcessingRef = useRef(false);

  const createEventFromImage = useMutation(
    api.ai.eventFromImageBase64ThenCreate,
  );

  // Handle drag enter
  const handleDragEnter = useCallback(
    (event: DragEvent) => {
      if (!enabled || !currentUser) return;

      event.preventDefault();
      event.stopPropagation();

      dragCounterRef.current += 1;

      // Only set dragging state if we have image files
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (hasImageFiles(event.dataTransfer!)) {
        if (dragCounterRef.current === 1) {
          setIsDragging(true);
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

      // Check processing lock
      if (isProcessingRef.current || isProcessing) return;
      isProcessingRef.current = true;

      try {
        // Extract images from drop
        const dataTransfer = event.dataTransfer;
        if (!dataTransfer) {
          isProcessingRef.current = false;
          return;
        }

        const images = extractImagesFromDataTransfer(dataTransfer);
        if (images.length === 0) {
          isProcessingRef.current = false;
          return;
        }

        // Validate the first image
        const image = images[0];
        if (!image) {
          isProcessingRef.current = false;
          return;
        }

        if (!isValidImageFile(image)) {
          setError("Unsupported image format");
          isProcessingRef.current = false;
          return;
        }

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
        console.error("Error processing dropped image:", err);
      } finally {
        // Always clear both the ref lock and state
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [
      enabled,
      currentUser,
      isProcessing,
      timezone,
      createEventFromImage,
      addWorkflowId,
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
  };
}
